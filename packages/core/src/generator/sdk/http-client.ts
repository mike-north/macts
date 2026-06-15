/**
 * HTTP client SDK generator for macts.
 *
 * Generates TypeScript SDK code that communicates with the macts API server
 * via HTTP instead of executing JXA directly.
 *
 * @packageDocumentation
 */

import type { AppManifest, Resource, Command } from '../../manifest/index.js'
import type { PropertyType } from '../../manifest/schemas/property.js'
import { propertyTypeToTs } from '../types.js'

/**
 * Reserved words in JavaScript/TypeScript that cannot be used as identifiers.
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

/**
 * Make a name safe to use as a JavaScript identifier by prefixing reserved words.
 */
function safeIdentifier(name: string): string {
  return RESERVED_WORDS.has(name) ? `_${name}` : name
}

/**
 * Options for HTTP client SDK generation.
 */
export interface HttpClientGeneratorOptions {
  /** Package name (e.g., @macts/sdk-calendar) */
  packageName: string
  /** Package version */
  version?: string | undefined
  /** Default API base URL */
  defaultBaseUrl?: string
  /** Default port */
  defaultPort?: number
}

/**
 * Result of HTTP client SDK generation.
 */
export interface GeneratedHttpClientSdk {
  files: { path: string; content: string }[]
  errors: string[]
}

const DEFAULT_BASE_URL = 'http://localhost'
const DEFAULT_PORT = 8372

/**
 * Generate HTTP client SDK from a manifest.
 *
 * @param manifest - The app manifest
 * @param options - Generation options
 * @returns Generated SDK files
 */
export function generateHttpClientSdk(
  manifest: AppManifest,
  options: HttpClientGeneratorOptions
): GeneratedHttpClientSdk {
  const files: { path: string; content: string }[] = []
  const errors: string[] = []
  const appName = manifest.app.name.replace(/\s+/g, '')
  const appNameLower = manifest.app.name.replace(/\s+/g, '-').toLowerCase()
  const baseUrl = options.defaultBaseUrl ?? DEFAULT_BASE_URL
  const port = options.defaultPort ?? DEFAULT_PORT

  try {
    // Generate types file
    files.push({
      path: 'src/types.ts',
      content: generateTypesFile(manifest),
    })

    // Generate client file
    files.push({
      path: 'src/client.ts',
      content: generateClientFile(manifest, appName, appNameLower, baseUrl, port),
    })

    // Generate resource clients
    for (const [resourceName, resource] of Object.entries(manifest.resources)) {
      files.push({
        path: `src/resources/${resourceName.toLowerCase()}.ts`,
        content: generateResourceClient(resourceName, resource, manifest, appNameLower),
      })
    }

    // Generate index file
    files.push({
      path: 'src/index.ts',
      content: generateIndexFile(manifest, appName),
    })

    // Generate package.json
    files.push({
      path: 'package.json',
      content: generatePackageJson(options, manifest.app.name),
    })

    // Generate tsconfig.json
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify(
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
      ),
    })

    // Generate tsup.config.ts
    files.push({
      path: 'tsup.config.ts',
      content: `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
`,
    })

    // Generate .gitignore
    files.push({
      path: '.gitignore',
      content: `dist/
node_modules/
*.tsbuildinfo
.turbo/
`,
    })

    // Generate api-extractor.json
    files.push({
      path: 'api-extractor.json',
      content: JSON.stringify(
        {
          $schema:
            'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
          extends: '../../api-extractor.base.json',
        },
        null,
        2
      ),
    })

    // Generate directory placeholders
    files.push({ path: 'api-report/.gitkeep', content: '' })
    files.push({ path: 'temp/.gitkeep', content: '' })
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return { files, errors }
}

/**
 * Generate TypeScript types file.
 */
function generateTypesFile(manifest: AppManifest): string {
  const lines: string[] = [
    '/**',
    ' * Type definitions for the SDK.',
    ' * Auto-generated - do not edit.',
    ' */',
    '',
    'import { z } from "zod";',
    '',
  ]

  // Generate enum types
  for (const [enumName, enumDef] of Object.entries(manifest.enums)) {
    lines.push(`/** ${enumDef.description ?? enumName} */`)
    const values = enumDef.values.map((v) => `'${String(v.value)}'`).join(' | ')
    lines.push(`export type ${enumName} = ${values};`)
    lines.push('')
  }

  // Generate resource types
  for (const [resourceName, resource] of Object.entries(manifest.resources)) {
    const props = Object.entries(resource.properties)
    lines.push(`/** ${resource.description} */`)
    if (props.length === 0) {
      // Use Record<string, never> for resources with no properties
      lines.push(`export type ${resourceName} = Record<string, never>;`)
    } else {
      lines.push(`export interface ${resourceName} {`)
      for (const [propName, prop] of props) {
        const tsType = propertyTypeToTs(prop.type)
        const optional = prop.optional ? '?' : ''
        lines.push(`  /** ${prop.description} */`)
        lines.push(`  ${propName}${optional}: ${tsType};`)
      }
      lines.push('}')
    }
    lines.push('')

    // Generate create input type (writable properties only)
    const writableProps = Object.entries(resource.properties).filter(
      ([_, prop]) => prop.access === 'rw'
    )

    lines.push(`/** Input for creating a ${resourceName} */`)
    if (writableProps.length === 0) {
      // Use Record<string, never> for resources with no writable properties
      lines.push(`export type ${resourceName}CreateInput = Record<string, never>;`)
    } else {
      lines.push(`export interface ${resourceName}CreateInput {`)
      for (const [propName, prop] of writableProps) {
        const tsType = propertyTypeToTs(prop.type)
        lines.push(`  /** ${prop.description} */`)
        lines.push(`  ${propName}?: ${tsType};`)
      }
      lines.push('}')
    }
    lines.push('')

    // Generate update input type
    lines.push(`/** Input for updating a ${resourceName} */`)
    lines.push(`export type ${resourceName}UpdateInput = Partial<${resourceName}CreateInput>;`)
    lines.push('')
  }

  // Generate Zod schemas for runtime validation
  lines.push('// Zod schemas for runtime validation')
  lines.push('')
  for (const [resourceName, resource] of Object.entries(manifest.resources)) {
    lines.push(`export const ${resourceName}Schema = z.object({`)
    for (const [propName, prop] of Object.entries(resource.properties)) {
      const zodType = propertyTypeToZod(prop.type, prop.optional)
      lines.push(`  ${propName}: ${zodType},`)
    }
    lines.push('});')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Convert property type to Zod schema string.
 */
function propertyTypeToZod(type: PropertyType | undefined, optional: boolean): string {
  let zodType: string

  if (type === undefined) {
    zodType = 'z.string()'
  } else if (typeof type === 'string') {
    switch (type) {
      case 'string':
        zodType = 'z.string()'
        break
      case 'number':
      case 'integer':
        zodType = 'z.number()'
        break
      case 'boolean':
        zodType = 'z.boolean()'
        break
      case 'date':
        zodType = 'z.string()' // Dates come as ISO strings from API
        break
      case 'data':
        zodType = 'z.string()' // Base64 encoded
        break
      case 'any':
        zodType = 'z.unknown()'
        break
      case 'file':
        zodType = 'z.string()'
        break
      case 'point':
        zodType = 'z.object({ x: z.number(), y: z.number() })'
        break
      case 'rect':
        zodType =
          'z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })'
        break
      case 'rgb':
        zodType = 'z.object({ red: z.number(), green: z.number(), blue: z.number() })'
        break
      default:
        zodType = 'z.unknown()'
    }
  } else if ('array' in type) {
    const elementType = propertyTypeToZod(type.array, false)
    zodType = `z.array(${elementType})`
  } else if ('resource' in type) {
    zodType = 'z.string()' // Resource references are IDs
  } else if ('enum' in type) {
    zodType = 'z.string()' // Enums are string values
  } else {
    zodType = 'z.unknown()'
  }

  return optional ? `${zodType}.optional()` : zodType
}

/**
 * Generate main client file.
 */
function generateClientFile(
  manifest: AppManifest,
  appName: string,
  appNameLower: string,
  baseUrl: string,
  port: number
): string {
  const resourceImports = Object.keys(manifest.resources)
    .map((r) => `import { ${r}ResourceClient } from './resources/${r.toLowerCase()}.js';`)
    .join('\n')

  // Find enum types used in app-level commands
  const enumsUsedInCommands = new Set<string>()
  for (const cmd of Object.values(manifest.commands)) {
    if (cmd.scope === 'application') {
      for (const param of cmd.parameters) {
        // Check if type is an enum reference
        const paramType = param.type as PropertyType | undefined
        if (typeof paramType === 'object' && 'enum' in paramType) {
          enumsUsedInCommands.add(paramType.enum)
        } else if (typeof paramType === 'string' && manifest.enums[paramType]) {
          enumsUsedInCommands.add(paramType)
        }
      }
    }
  }
  const enumImports =
    enumsUsedInCommands.size > 0
      ? `import type { ${Array.from(enumsUsedInCommands).join(', ')} } from './types.js';`
      : ''

  const resourceProperties = Object.entries(manifest.resources)
    .map(([name, resource]) => {
      const plural = resource.plural.toLowerCase()
      return `
  /** ${resource.description} */
  readonly ${plural}: ${name}ResourceClient;`
    })
    .join('\n')

  const resourceInitializers = Object.entries(manifest.resources)
    .map(([name, resource]) => {
      const plural = resource.plural.toLowerCase()
      return `    this.${plural} = new ${name}ResourceClient(this.#httpClient, '${appNameLower}', '${plural}');`
    })
    .join('\n')

  // Generate app-level command methods
  const appCommands = Object.entries(manifest.commands)
    .filter(([_, cmd]) => cmd.scope === 'application')
    .map(([_, cmd]) => generateAppCommandMethod(cmd, appNameLower))
    .join('\n\n')

  return `/**
 * ${appName} HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

${resourceImports}
${enumImports}

/**
 * Client configuration options.
 */
export interface ${appName}ClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: ${baseUrl}:${String(port)}) */
  baseUrl?: string;
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = \`\${this.#baseUrl}/api/v1/rpc/\${path}\`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.#apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { code?: string; message?: string } };
      const code = error.error?.code ?? 'UNKNOWN_ERROR';
      const message = error.error?.message ?? \`HTTP \${String(response.status)}\`;
      throw new ${appName}Error(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for ${appName} API errors.
 */
export class ${appName}Error extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = '${appName}Error';
    this.code = code;
  }
}

/**
 * ${appName} client for HTTP-based macOS automation.
 *
 * @example
 * \`\`\`typescript
 * const client = new ${appName}Client({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * \`\`\`
 */
export class ${appName}Client {
  readonly #httpClient: HttpClient;
${resourceProperties}

  constructor(options: ${appName}ClientOptions) {
    const baseUrl = options.baseUrl ?? '${baseUrl}:${String(port)}';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
${resourceInitializers}
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }
${appCommands}
}
`
}

/**
 * Generate method for app-level command.
 */
function generateAppCommandMethod(cmd: Command, appNameLower: string): string {
  // Sort parameters: required first, then optional
  const sortedParams = [...cmd.parameters].sort((a, b) => {
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return 0
  })
  const params = sortedParams.map((p) => {
    const tsType = propertyTypeToTs(
      typeof p.type === 'string' ? (p.type as PropertyType) : 'string'
    )
    const optional = !p.required ? '?' : ''
    const safeName = safeIdentifier(p.name)
    return `${safeName}${optional}: ${tsType}`
  })

  const returnType = cmd.returns ? propertyTypeToTs(cmd.returns as PropertyType) : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const bodyProps = cmd.parameters
    .map((p) => {
      const safeName = safeIdentifier(p.name)
      return safeName === p.name ? safeName : `'${p.name}': ${safeName}`
    })
    .join(', ')
  const bodyArg = bodyProps ? `{ ${bodyProps} }` : '{}'

  const rpcCall = needsAwait
    ? `await this.#httpClient.rpc<${rpcReturnType}>('${appNameLower}.app.${cmd.name}', ${bodyArg});`
    : `return this.#httpClient.rpc<${rpcReturnType}>('${appNameLower}.app.${cmd.name}', ${bodyArg});`

  return `
  /**
   * ${cmd.description}
   */
  async ${safeIdentifier(cmd.name)}(${params.join(', ')}): Promise<${returnType}> {
    ${rpcCall}
  }`
}

/**
 * Generate resource client file.
 */
function generateResourceClient(
  resourceName: string,
  resource: Resource,
  manifest: AppManifest,
  appNameLower: string
): string {
  const nameLower = resourceName.toLowerCase()
  const plural = resource.plural.toLowerCase()

  // Find commands that apply to this resource
  const resourceCommands = Object.entries(manifest.commands).filter(([_, cmd]) => {
    if (cmd.scope !== 'resource') return false
    if (!cmd.resourceType) return true
    if (Array.isArray(cmd.resourceType)) {
      return cmd.resourceType.includes(resourceName)
    }
    return cmd.resourceType === resourceName
  })

  const commandMethods = resourceCommands
    .map(([_, cmd]) => generateResourceCommandMethod(cmd, appNameLower, plural, resourceName))
    .join('\n')

  // Collect custom types (enums, referenced resources) used by resource command
  // method signatures so they can be imported. Without this, a command parameter
  // or return value typed as an enum (e.g. SaveFormat) references an unimported name.
  const extraTypeImports = new Set<string>()
  for (const [, cmd] of resourceCommands) {
    if (['list', 'get', 'create', 'update', 'delete'].includes(cmd.name)) continue
    const referencedTypes = [
      ...cmd.parameters.map((p) =>
        typeof p.type === 'string' ? (p.type as PropertyType) : 'string'
      ),
      ...(cmd.returns ? [cmd.returns as PropertyType] : []),
    ]
    for (const t of referencedTypes) {
      const tsName = propertyTypeToTs(t)
      // Strip array suffix and only import names that exist as manifest enums or
      // resources (the resource's own type plus Create/Update are already imported).
      const baseName = tsName.replace(/\[\]$/, '')
      if (baseName === resourceName) continue
      if (manifest.enums[baseName] || manifest.resources[baseName]) {
        extraTypeImports.add(baseName)
      }
    }
  }

  // Merge the resource's own types with any extra referenced types into a single
  // import from '../types.js' for clean, deterministic output.
  const typeImports = [
    resourceName,
    `${resourceName}CreateInput`,
    `${resourceName}UpdateInput`,
    ...Array.from(extraTypeImports).sort(),
  ]

  // Find identifiers
  const identifiers = resource.identifiers ?? []
  const primaryId = identifiers.find((id) => id.primary)?.property ?? identifiers[0]?.property

  return `/**
 * ${resourceName} client for ${manifest.app.name} SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ${typeImports.join(', ')} } from '../types.js';

/**
 * Client for ${resource.description.toLowerCase()}.
 */
export class ${resourceName}ResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all ${plural}.
   */
  async list(): Promise<${resourceName}[]> {
    return this.#http.rpc<${resourceName}[]>(\`\${this.#app}.\${this.#resource}.list\`);
  }

  /**
   * Get a ${nameLower} by ${primaryId ?? 'id'}.
   */
  async get(${primaryId ?? 'id'}: string): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.get\`, { ${primaryId ?? 'id'} });
  }

  /**
   * Create a new ${nameLower}.
   */
  async create(input: ${resourceName}CreateInput): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.create\`, input);
  }

  /**
   * Update an existing ${nameLower}.
   */
  async update(${primaryId ?? 'id'}: string, input: ${resourceName}UpdateInput): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.update\`, { ${primaryId ?? 'id'}, ...input });
  }

  /**
   * Delete a ${nameLower}.
   */
  async delete(${primaryId ?? 'id'}: string): Promise<void> {
    await this.#http.rpc<undefined>(\`\${this.#app}.\${this.#resource}.delete\`, { ${primaryId ?? 'id'} });
  }
${commandMethods}
}
`
}

/**
 * Generate method for resource-level command.
 */
function generateResourceCommandMethod(
  cmd: Command,
  appNameLower: string,
  plural: string,
  _resourceName: string
): string {
  // Skip standard CRUD commands as they're already generated
  if (['list', 'get', 'create', 'update', 'delete'].includes(cmd.name)) {
    return ''
  }

  const params = cmd.parameters.map((p) => {
    const tsType = propertyTypeToTs(
      typeof p.type === 'string' ? (p.type as PropertyType) : 'string'
    )
    const optional = !p.required ? '?' : ''
    const safeName = safeIdentifier(p.name)
    return `${safeName}${optional}: ${tsType}`
  })

  const returnType = cmd.returns ? propertyTypeToTs(cmd.returns as PropertyType) : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const bodyProps = cmd.parameters
    .map((p) => {
      const safeName = safeIdentifier(p.name)
      return safeName === p.name ? safeName : `'${p.name}': ${safeName}`
    })
    .join(', ')
  const bodyArg = bodyProps ? `{ ${bodyProps} }` : '{}'

  const rpcCall = needsAwait
    ? `await this.#http.rpc<${rpcReturnType}>('${appNameLower}.${plural}.${cmd.name}', ${bodyArg});`
    : `return this.#http.rpc<${rpcReturnType}>('${appNameLower}.${plural}.${cmd.name}', ${bodyArg});`

  return `

  /**
   * ${cmd.description}
   */
  async ${safeIdentifier(cmd.name)}(${params.join(', ')}): Promise<${returnType}> {
    ${rpcCall}
  }`
}

/**
 * Generate index file.
 */
function generateIndexFile(manifest: AppManifest, appName: string): string {
  const resourceExports = Object.keys(manifest.resources)
    .map((r) => `export { ${r}ResourceClient } from './resources/${r.toLowerCase()}.js';`)
    .join('\n')

  return `/**
 * ${manifest.app.name} HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * \`\`\`typescript
 * import { ${appName}Client } from '@macts/sdk-${manifest.app.name.toLowerCase()}';
 *
 * const client = new ${appName}Client({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * \`\`\`
 *
 * @packageDocumentation
 */

export { ${appName}Client, ${appName}Error, HttpClient } from './client.js';
export type { ${appName}ClientOptions } from './client.js';
export * from './types.js';
${resourceExports}
`
}

/**
 * Generate package.json.
 */
function generatePackageJson(options: HttpClientGeneratorOptions, appName: string): string {
  const unscopedName = options.packageName.replace(/^@[^/]+\//, '')
  const typesPath = `./dist/${unscopedName}.d.ts`

  const pkg = {
    name: options.packageName,
    version: options.version ?? '0.0.0',
    description: `HTTP client SDK for ${appName} automation`,
    license: 'MIT',
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
    keywords: ['macts-sdk'],
    scripts: {
      build: 'tsup',
      'api-extractor': 'api-extractor run --local',
      'api-extractor:ci': 'api-extractor run',
      lint: 'eslint src',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      zod: '^4.3.6',
    },
    devDependencies: {
      tsup: 'catalog:',
      typescript: 'catalog:',
      vitest: 'catalog:',
    },
  }
  return JSON.stringify(pkg, null, 2)
}
