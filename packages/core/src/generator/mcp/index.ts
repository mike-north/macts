/**
 * MCP plugin generator.
 *
 * Generates MCP plugins from app manifests using the HTTP client SDK pattern.
 *
 * @packageDocumentation
 */

export * from './types.js'
export * from './context.js'
export * from './tools.js'

import type {
  McpGeneratorContext,
  GeneratedMcpPlugin,
  GeneratedTool,
  GeneratedToolFile,
} from './types.js'
import { getResources, getResourceCommands, getAppCommands } from './context.js'
import { generateResourceTool, generateAppTool } from './tools.js'

/**
 * Reserved words that cannot be used as JS identifiers.
 */
const RESERVED_WORDS = new Set([
  'arguments',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

function safeIdentifier(name: string): string {
  return RESERVED_WORDS.has(name) ? `_${name}` : name
}

/**
 * Convert a hyphenated name to camelCase for use as a JS identifier.
 * e.g., "google-chrome" → "googleChrome"
 */
function toCamelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Make property names safe for destructuring, mapping reserved words to safe aliases.
 * Returns [destructuredNames, aliasMap] where aliasMap maps safe names back to originals.
 */
function safeDestructure(names: string[]): { destructured: string; callArgs: string } {
  const safeNames = names.map((n) => safeIdentifier(n))
  const hasRenames = names.some((n, i) => safeNames[i] !== n)

  if (!hasRenames) {
    return {
      destructured: names.join(', '),
      callArgs: names.join(', '),
    }
  }

  // Use renaming destructuring: { new: _new, for: _for }
  const destructured = names
    .map((n, i) => (safeNames[i] !== n ? `${n}: ${safeNames[i]}` : n))
    .join(', ')
  const callArgs = names
    .map((n, i) => (safeNames[i] !== n ? `'${n}': ${safeNames[i]}` : n))
    .join(', ')

  return { destructured, callArgs }
}

/**
 * Generate TypeScript code for a tool definition.
 */
function generateToolCode(tool: GeneratedTool, _appName: string): string {
  const constantName = `${tool.resourceName}${tool.operationName.charAt(0).toUpperCase()}${tool.operationName.slice(1)}Tool`

  // Generate the input schema as a literal object
  const schemaStr = JSON.stringify(tool.inputSchema, null, 2)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : `  ${line}`))
    .join('\n')

  // Generate handler code based on operation type
  let handlerCode: string

  if (tool.isResourceOperation) {
    handlerCode = generateResourceToolHandler(tool)
  } else {
    handlerCode = generateAppToolHandler(tool)
  }

  const escapedDescription = tool.description.replace(/'/g, "\\'")
  return `/**
 * ${tool.description}
 */
export const ${constantName}: McpToolDefinition = {
  name: '${tool.name}',
  description: '${escapedDescription}',
  inputSchema: ${schemaStr},
  handler: ${handlerCode},
};
`
}

/**
 * Generate handler code for a resource operation tool using HTTP client.
 */
function generateResourceToolHandler(tool: GeneratedTool): string {
  const resourceName = tool.resourceName

  // Build type annotation for args
  const properties = (tool.inputSchema.properties ?? {}) as Record<string, unknown>
  const required = (tool.inputSchema.required ?? []) as string[]
  const argsType =
    Object.keys(properties).length > 0
      ? `{ ${Object.keys(properties)
          .map(
            (p) => `${p}${required.includes(p) ? '' : '?'}: ${inferTypeFromSchema(properties[p])}`
          )
          .join('; ')} }`
      : '{}'

  switch (tool.operationName) {
    case 'list':
      if (Object.keys(properties).length > 0) {
        const { destructured: listDestructured } = safeDestructure(Object.keys(properties))
        const safeListProps = Object.keys(properties).map((p) => safeIdentifier(p))
        return `async (args) => {
    const { ${listDestructured} } = args as ${argsType};
    void ${safeListProps.join('; void ')};
    const client = getClient();
    return client.${resourceName}.list();
  }`
      }
      return `async () => {
    const client = getClient();
    return client.${resourceName}.list();
  }`

    case 'get': {
      const idProp = Object.keys(properties)[0] ?? 'id'
      const safeId = safeIdentifier(idProp)
      const getDestructured = safeId !== idProp ? `${idProp}: ${safeId}` : idProp
      return `async (args) => {
    const { ${getDestructured} } = args as ${argsType};
    const client = getClient();
    return client.${resourceName}.get(${safeId});
  }`
    }

    case 'create': {
      return `async (args) => {
    const client = getClient();
    return client.${resourceName}.create(args as Record<string, unknown>);
  }`
    }

    case 'update': {
      const propNames = Object.keys(properties)
      const idProp = required[0] ?? propNames[0] ?? 'id'
      const updateProps = propNames.filter((p) => p !== idProp)
      return `async (args) => {
    const { ${idProp}, ...updateFields } = args as ${argsType};
    void ${updateProps.length > 0 ? 'updateFields' : '0'};
    const client = getClient();
    return client.${resourceName}.update(${idProp}, updateFields as Record<string, unknown>);
  }`
    }

    case 'delete': {
      const idProp = Object.keys(properties)[0] ?? 'id'
      const resourceTypeName = tool.resourceType ?? 'Resource'
      return `async (args) => {
    const { ${idProp} } = args as ${argsType};
    const client = getClient();
    await client.${resourceName}.delete(${idProp});
    return { success: true, message: \`Deleted ${resourceTypeName} \${${idProp}}\` };
  }`
    }

    default: {
      // Generic operation (show, complete, etc.)
      const propNames = Object.keys(properties)
      const idProp = required[0] ?? propNames[0] ?? 'id'
      const safeIdProp = safeIdentifier(idProp)

      if (propNames.length === 0) {
        return `async () => {
    const client = getClient();
    await client.${resourceName}.${safeIdentifier(tool.operationName)}();
    return { success: true };
  }`
      }

      const destructuredId = safeIdProp !== idProp ? `${idProp}: ${safeIdProp}` : idProp
      return `async (args) => {
    const { ${destructuredId} } = args as ${argsType};
    const client = getClient();
    await client.${resourceName}.${safeIdentifier(tool.operationName)}(${safeIdProp});
    return { success: true, message: \`${tool.description.replace(/'/g, "\\'")} \${${safeIdProp}}\` };
  }`
    }
  }
}

/**
 * Generate handler code for an application command tool using HTTP client.
 *
 * SDK app command methods take positional arguments (required first, then optional),
 * so we must pass args positionally rather than as an object.
 */
function generateAppToolHandler(tool: GeneratedTool): string {
  const properties = (tool.inputSchema.properties ?? {}) as Record<string, unknown>
  const required = (tool.inputSchema.required ?? []) as string[]
  const methodName = safeIdentifier(tool.operationName)

  const propNames = Object.keys(properties)

  if (propNames.length === 0) {
    return `async () => {
    const client = getClient();
    await client.${methodName}();
    return { success: true };
  }`
  }

  // Sort params: required first, then optional (matching SDK method signature order)
  const sortedProps = [...propNames].sort((a, b) => {
    const aReq = required.includes(a)
    const bReq = required.includes(b)
    if (aReq && !bReq) return -1
    if (!aReq && bReq) return 1
    return 0
  })

  const argsType = `{ ${sortedProps.map((p) => `${p}${required.includes(p) ? '' : '?'}: ${inferTypeFromSchema(properties[p])}`).join('; ')} }`
  const { destructured } = safeDestructure(sortedProps)

  // Pass arguments positionally to match SDK method signature.
  // Cast each arg to satisfy SDK's precise types (MCP infers from JSON Schema which is less specific).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const positionalArgs = sortedProps.map((p) => `${safeIdentifier(p)} as any`).join(', ')

  return `async (args) => {
    const { ${destructured} } = args as ${argsType};
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await client.${methodName}(${positionalArgs});
    return { success: true };
  }`
}

/**
 * Infer TypeScript type from JSON Schema property.
 */
function inferTypeFromSchema(schema: unknown): string {
  if (typeof schema !== 'object' || schema === null) return 'unknown'
  const schemaObj = schema as { type?: string; items?: unknown }

  if (schemaObj.type === 'string') return 'string'
  if (schemaObj.type === 'number') return 'number'
  if (schemaObj.type === 'boolean') return 'boolean'
  if (schemaObj.type === 'array') return `${inferTypeFromSchema(schemaObj.items)}[]`
  if (schemaObj.type === 'object') return 'Record<string, unknown>'

  return 'unknown'
}

/**
 * Generate tool file content.
 */
function generateToolFile(
  tools: GeneratedTool[],
  resourceName: string,
  appName: string
): GeneratedToolFile {
  const capitalizedAppName = appName.charAt(0).toUpperCase() + appName.slice(1)

  const toolsCode = tools.map((tool) => generateToolCode(tool, appName)).join('\n')

  const content = `/**
 * MCP tools for ${capitalizedAppName}.app ${resourceName} operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

${toolsCode}
`

  return {
    fileName: `${resourceName}.ts`,
    content,
    tools,
  }
}

/**
 * Generate tools index file.
 */
function generateToolsIndex(toolFiles: GeneratedToolFile[]): string {
  const imports: string[] = []
  const exports: string[] = []

  for (const file of toolFiles) {
    const baseName = file.fileName.replace('.ts', '')
    for (const tool of file.tools) {
      const constantName = `${tool.resourceName}${tool.operationName.charAt(0).toUpperCase()}${tool.operationName.slice(1)}Tool`
      imports.push(`import { ${constantName} } from './${baseName}.js';`)
      exports.push(`  ${constantName},`)
    }
  }

  return `/**
 * All MCP tools for ${toolFiles[0]?.tools[0]?.name.split('__')[1] ?? 'app'}.
 *
 * @packageDocumentation
 */

${imports.join('\n')}

/**
 * All MCP tools.
 */
export const allTools = [
${exports.join('\n')}
] as const;
`
}

/**
 * Generate plugin.ts file.
 */
function generatePluginFile(context: McpGeneratorContext): string {
  const capitalizedAppName = context.manifest.app.name

  return `/**
 * MCP plugin for ${capitalizedAppName}.app.
 *
 * @packageDocumentation
 */

import type { McpPlugin } from '@macts/mcp';
import { allTools } from './tools/index.js';

/**
 * MCP plugin for macOS ${capitalizedAppName}.app automation.
 *
 * Provides tools for managing ${context.appName} resources.
 */
export const ${toCamelCase(context.appName)}Plugin: McpPlugin = {
  name: '${context.appName}',
  description: 'MCP plugin for macOS ${capitalizedAppName}.app automation',
  tools: allTools,
};
`
}

/**
 * Generate index.ts file.
 */
function generateIndexFile(context: McpGeneratorContext): string {
  return `/**
 * MCP plugin for macOS ${context.manifest.app.name}.app.
 *
 * @packageDocumentation
 */

// Export as 'plugin' to match MCP plugin loader convention
export { ${toCamelCase(context.appName)}Plugin as plugin, ${toCamelCase(context.appName)}Plugin } from './plugin.js';
export type { McpPlugin, McpToolDefinition } from '@macts/mcp';
`
}

/**
 * Generate sdk.ts wrapper file.
 */
function generateSdkFile(context: McpGeneratorContext): string {
  // Remove spaces for use in identifiers (e.g., "Google Chrome" → "GoogleChrome")
  const capitalizedAppName = context.manifest.app.name.replace(/\s+/g, '')

  return `/**
 * SDK wrapper for the ${capitalizedAppName} HTTP client.
 *
 * @packageDocumentation
 */

import { ${capitalizedAppName}Client, type ${capitalizedAppName}ClientOptions } from '${context.sdkPackageName}';

/**
 * Get a ${capitalizedAppName}Client instance.
 *
 * Uses MACTS_API_KEY environment variable for authentication.
 * Uses MACTS_API_URL environment variable for custom server URL.
 *
 * @returns Configured ${capitalizedAppName}Client
 * @throws Error if MACTS_API_KEY is not set
 */
export function get${capitalizedAppName}Client(): ${capitalizedAppName}Client {
  const apiKey = process.env['MACTS_API_KEY'];

  if (!apiKey) {
    throw new Error(
      'MACTS_API_KEY environment variable is required. ' +
        'Create an API key with: macts api-key create --permissions ${context.appName}:*:*'
    );
  }

  const options: ${capitalizedAppName}ClientOptions = {
    apiKey,
  };

  const baseUrl = process.env['MACTS_API_URL'];
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new ${capitalizedAppName}Client(options);
}

/**
 * Singleton client instance.
 * Lazily initialized on first use.
 */
let _client: ${capitalizedAppName}Client | null = null;

/**
 * Get or create the singleton ${capitalizedAppName}Client.
 *
 * This is the recommended way to get a client instance as it
 * avoids creating multiple HTTP connections.
 */
export function getClient(): ${capitalizedAppName}Client {
  _client ??= get${capitalizedAppName}Client();
  return _client;
}

/**
 * Reset the singleton client.
 * Useful for testing.
 */
export function resetClient(): void {
  _client = null;
}
`
}

/**
 * Generate package.json file.
 */
function generatePackageJson(context: McpGeneratorContext): string {
  const version = context.version ?? '0.0.0'
  const capitalizedAppName = context.manifest.app.name
  const unscopedName = context.packageName.replace(/^@[^/]+\//, '')
  const typesPath = `./dist/${unscopedName}.d.ts`

  return JSON.stringify(
    {
      name: context.packageName,
      version,
      description: `MCP plugin for macOS ${capitalizedAppName}.app`,
      keywords: ['macts-mcp-plugin'],
      type: 'module',
      exports: {
        '.': {
          types: typesPath,
          import: './dist/index.js',
        },
      },
      main: './dist/index.js',
      types: typesPath,
      files: ['dist'],
      scripts: {
        build: 'tsup',
        'api-extractor': 'api-extractor run --local',
        'api-extractor:ci': 'api-extractor run',
        lint: 'eslint src',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@macts/mcp': 'workspace:*',
        [context.sdkPackageName]: 'workspace:*',
      },
      devDependencies: {
        tsup: 'catalog:',
        vitest: 'catalog:',
        typescript: 'catalog:',
      },
    },
    null,
    2
  )
}

const TSCONFIG_JSON = JSON.stringify(
  {
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      rootDir: 'src',
      outDir: 'dist',
    },
    include: ['src'],
  },
  null,
  2
)

const TSUP_CONFIG = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
`

const VITEST_CONFIG = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
`

const GITIGNORE = `dist/
node_modules/
*.tsbuildinfo
.turbo/
`

const API_EXTRACTOR_JSON = JSON.stringify(
  {
    $schema:
      'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
    extends: '../../api-extractor.base.json',
  },
  null,
  2
)

/**
 * Generate an MCP plugin from a manifest.
 *
 * @param context - MCP generator context
 * @returns Generated MCP plugin with all files
 */
export function generateMcpPlugin(context: McpGeneratorContext): GeneratedMcpPlugin {
  const allTools: GeneratedTool[] = []
  const toolFileMap = new Map<string, GeneratedTool[]>()

  // Generate tools for each resource
  const resources = getResources(context.manifest)
  for (const resource of resources) {
    const commands = getResourceCommands(context.manifest, resource.name)
    const resourceTools: GeneratedTool[] = []

    for (const command of commands) {
      const tool = generateResourceTool(context.appName, resource, command)
      resourceTools.push(tool)
      allTools.push(tool)
    }

    if (resourceTools.length > 0) {
      toolFileMap.set(resource.plural.toLowerCase(), resourceTools)
    }
  }

  // Generate tools for application commands
  const appCommands = getAppCommands(context.manifest)
  if (appCommands.length > 0) {
    const appTools: GeneratedTool[] = []
    for (const command of appCommands) {
      const tool = generateAppTool(context.appName, command)
      appTools.push(tool)
      allTools.push(tool)
    }
    toolFileMap.set('app', appTools)
  }

  // Generate tool files
  const toolFiles: GeneratedToolFile[] = []
  for (const [resourceName, tools] of toolFileMap.entries()) {
    const toolFile = generateToolFile(tools, resourceName, context.appName)
    toolFiles.push(toolFile)
  }

  const pluginContent = generatePluginFile(context)
  const toolsIndexContent = generateToolsIndex(toolFiles)
  const indexContent = generateIndexFile(context)
  const packageJson = generatePackageJson(context)

  // Build files array
  const files: { path: string; content: string }[] = []

  // Source files
  for (const toolFile of toolFiles) {
    files.push({ path: `src/tools/${toolFile.fileName}`, content: toolFile.content })
  }
  files.push({ path: 'src/tools/index.ts', content: toolsIndexContent })
  files.push({ path: 'src/plugin.ts', content: pluginContent })
  files.push({ path: 'src/index.ts', content: indexContent })
  files.push({ path: 'src/sdk.ts', content: generateSdkFile(context) })

  // Config files
  files.push({ path: 'package.json', content: packageJson })
  files.push({ path: 'tsconfig.json', content: TSCONFIG_JSON })
  files.push({ path: 'tsup.config.ts', content: TSUP_CONFIG })
  files.push({ path: 'vitest.config.ts', content: VITEST_CONFIG })
  files.push({ path: '.gitignore', content: GITIGNORE })
  files.push({ path: 'api-extractor.json', content: API_EXTRACTOR_JSON })
  files.push({ path: 'api-report/.gitkeep', content: '' })
  files.push({ path: 'temp/.gitkeep', content: '' })

  return {
    pluginName: context.appName,
    pluginContent,
    toolFiles,
    toolsIndexContent,
    indexContent,
    packageJson,
    tools: allTools,
    files,
  }
}
