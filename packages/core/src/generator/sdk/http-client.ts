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

    // Generate resource clients (only for resources that expose operations)
    for (const [resourceName, resource] of Object.entries(manifest.resources)) {
      if (!resourceHasOperations(manifest, resourceName)) continue
      files.push({
        path: `src/resources/${resourceName.toLowerCase()}.ts`,
        content: generateResourceClient(resourceName, resource, manifest),
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

    // Generate create input type. The input is the union of the resource's
    // writable properties and the backing create command's parameters. The
    // command parameters are the single source of truth for what the server
    // actually validates, so identifier parameters that are NOT writable
    // properties (e.g. an Event's `calendarId`) must appear in the input —
    // otherwise the create call cannot send the identifier the server requires.
    const writableProps = Object.entries(resource.properties).filter(
      ([_, prop]) => prop.access === 'rw'
    )
    const createCommand = findResourceCreateCommand(manifest, resourceName)
    const createFields = new Map<string, { tsType: string; required: boolean; doc: string }>()
    for (const [propName, prop] of writableProps) {
      createFields.set(propName, {
        tsType: propertyTypeToTs(prop.type),
        required: false,
        doc: prop.description,
      })
    }
    if (createCommand) {
      for (const param of createCommand.parameters) {
        // Command parameters override/augment writable properties. A required
        // command parameter (typically an identifier like `calendarId`) is
        // surfaced as a required field.
        createFields.set(param.name, {
          tsType: propertyTypeToTs(
            typeof param.type === 'string' ? (param.type as PropertyType) : 'string'
          ),
          required: param.required,
          doc: param.description,
        })
      }
    }

    lines.push(`/** Input for creating a ${resourceName} */`)
    if (createFields.size === 0) {
      // Use Record<string, never> for resources with no create fields
      lines.push(`export type ${resourceName}CreateInput = Record<string, never>;`)
    } else {
      lines.push(`export interface ${resourceName}CreateInput {`)
      for (const [fieldName, field] of createFields) {
        const optional = field.required ? '' : '?'
        lines.push(`  /** ${field.doc} */`)
        lines.push(`  ${fieldName}${optional}: ${field.tsType};`)
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
  // Only resources that expose operations get a generated client.
  const operationalResources = Object.entries(manifest.resources).filter(([name]) =>
    resourceHasOperations(manifest, name)
  )

  const resourceImports = operationalResources
    .map(([r]) => `import { ${r}ResourceClient } from './resources/${r.toLowerCase()}.js';`)
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

  const resourceProperties = operationalResources
    .map(([name, resource]) => {
      const plural = resource.plural.toLowerCase()
      return `
  /** ${resource.description} */
  readonly ${plural}: ${name}ResourceClient;`
    })
    .join('\n')

  const resourceInitializers = operationalResources
    .map(([name, resource]) => {
      const plural = resource.plural.toLowerCase()
      return `    this.${plural} = new ${name}ResourceClient(this.#httpClient, '${appNameLower}', '${plural}');`
    })
    .join('\n')

  // Generate app-level command methods
  const appCommands = Object.entries(manifest.commands)
    .filter(([_, cmd]) => cmd.scope === 'application')
    .map(([key, cmd]) => generateAppCommandMethod(key, cmd, appNameLower))
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
 *
 * The route is keyed by the command's manifest key (`commandKey`), matching the
 * server router. Application commands are addressed as `{app}.app.{commandKey}`.
 */
function generateAppCommandMethod(commandKey: string, cmd: Command, appNameLower: string): string {
  const { signature, bodyArg } = buildParamsAndBody(cmd)

  const returnType = cmd.returns ? propertyTypeToTs(cmd.returns as PropertyType) : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const rpcCall = needsAwait
    ? `await this.#httpClient.rpc<${rpcReturnType}>('${appNameLower}.app.${commandKey}', ${bodyArg});`
    : `return this.#httpClient.rpc<${rpcReturnType}>('${appNameLower}.app.${commandKey}', ${bodyArg});`

  return `
  /**
   * ${cmd.description}
   */
  async ${safeIdentifier(cmd.name)}(${signature}): Promise<${returnType}> {
    ${rpcCall}
  }`
}

/**
 * Standard CRUD operation names. A resource command's `name` field identifies
 * which CRUD shape (if any) it fulfils; the command's *key* in
 * `manifest.commands` is what addresses its route.
 */
const CRUD_OPERATIONS = ['list', 'get', 'create', 'update', 'delete'] as const

/**
 * Whether a command's `name` corresponds to a standard CRUD operation.
 */
function isCrudName(name: string): name is (typeof CRUD_OPERATIONS)[number] {
  return (CRUD_OPERATIONS as readonly string[]).includes(name)
}

/**
 * Whether a resource command applies to a given resource (matches its
 * `resourceType`, or applies to all resources when `resourceType` is omitted).
 */
function commandAppliesToResource(cmd: Command, resourceName: string): boolean {
  if (cmd.scope !== 'resource') return false
  if (cmd.resourceType === undefined) return true
  if (Array.isArray(cmd.resourceType)) return cmd.resourceType.includes(resourceName)
  return cmd.resourceType === resourceName
}

/**
 * Whether a resource has at least one operation (CRUD or custom command) in the
 * manifest. Resources with no operations are omitted from the generated SDK
 * entirely — there is nothing to call, and an empty resource client would be
 * dead API surface.
 */
export function resourceHasOperations(manifest: AppManifest, resourceName: string): boolean {
  return Object.values(manifest.commands).some((cmd) => commandAppliesToResource(cmd, resourceName))
}

/**
 * Find the backing `create` command for a resource, if any. Used to augment the
 * resource's create-input type with the command's required identifier parameters.
 */
function findResourceCreateCommand(
  manifest: AppManifest,
  resourceName: string
): Command | undefined {
  for (const cmd of Object.values(manifest.commands)) {
    if (cmd.scope !== 'resource') continue
    if (cmd.name !== 'create') continue
    if (cmd.resourceType === undefined) return cmd
    if (Array.isArray(cmd.resourceType)) {
      if (cmd.resourceType.includes(resourceName)) return cmd
    } else if (cmd.resourceType === resourceName) {
      return cmd
    }
  }
  return undefined
}

/**
 * Find the backing command (key + definition) for a CRUD operation on a
 * resource. The route is keyed by the command's manifest key (e.g.
 * `createEvent`), NOT by its `name` (`create`) — those differ for manifest-named
 * commands, and addressing by `name` is exactly what broke the structured write
 * path. Returns undefined when the manifest declares no such operation, so the
 * SDK omits the method instead of emitting an unreachable one.
 */
function findCrudCommand(
  resourceCommands: [string, Command][],
  operation: (typeof CRUD_OPERATIONS)[number]
): [string, Command] | undefined {
  return resourceCommands.find(([, cmd]) => cmd.name === operation)
}

/**
 * Generate resource client file.
 */
function generateResourceClient(
  resourceName: string,
  resource: Resource,
  manifest: AppManifest
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

  // Resolve the backing command for each CRUD shape so routes can be keyed by
  // the command's manifest key (the single source of truth shared with the
  // server router) rather than by the operation name.
  const listCmd = findCrudCommand(resourceCommands, 'list')
  const getCmd = findCrudCommand(resourceCommands, 'get')
  const createCmd = findCrudCommand(resourceCommands, 'create')
  const updateCmd = findCrudCommand(resourceCommands, 'update')
  const deleteCmd = findCrudCommand(resourceCommands, 'delete')

  const commandMethods = resourceCommands
    .map(([key, cmd]) => generateResourceCommandMethod(key, cmd))
    .join('\n')

  // The resource's own type is referenced by the CRUD methods' return types
  // (list/get/create/update). It may also be referenced by a non-CRUD command's
  // parameter or return type. Only import it when something actually uses it,
  // otherwise strict `noUnusedLocals` rejects the generated file.
  let usesOwnType = Boolean(listCmd ?? getCmd ?? createCmd ?? updateCmd)

  // Collect custom types (enums, referenced resources) used by non-CRUD resource
  // command method signatures so they can be imported. Without this, a command
  // parameter or return value typed as an enum (e.g. SaveFormat) references an
  // unimported name.
  const extraTypeImports = new Set<string>()
  for (const [, cmd] of resourceCommands.filter(([, c]) => !isCrudName(c.name))) {
    const referencedTypes = [
      ...cmd.parameters.map((p) =>
        typeof p.type === 'string' ? (p.type as PropertyType) : 'string'
      ),
      ...(cmd.returns ? [cmd.returns as PropertyType] : []),
    ]
    for (const t of referencedTypes) {
      const tsName = propertyTypeToTs(t)
      // Strip array suffix and only import names that exist as manifest enums or
      // resources (the Create/Update input types are already imported).
      const baseName = tsName.replace(/\[\]$/, '')
      if (baseName === resourceName) {
        usesOwnType = true
        continue
      }
      if (manifest.enums[baseName] || manifest.resources[baseName]) {
        extraTypeImports.add(baseName)
      }
    }
  }

  // Find identifiers
  const identifiers = resource.identifiers ?? []
  const primaryId = identifiers.find((id) => id.primary)?.property ?? identifiers[0]?.property

  const crudMethods = [
    listCmd ? generateListMethod(listCmd[0], resourceName, plural) : '',
    getCmd ? generateGetMethod(getCmd[0], getCmd[1], resourceName, nameLower, primaryId) : '',
    createCmd ? generateCreateMethod(createCmd[0], createCmd[1], resourceName, nameLower) : '',
    updateCmd
      ? generateUpdateMethod(updateCmd[0], updateCmd[1], resourceName, nameLower, primaryId)
      : '',
    deleteCmd ? generateDeleteMethod(deleteCmd[0], deleteCmd[1], nameLower, primaryId) : '',
  ]
    .filter(Boolean)
    .join('\n')

  const methodBody = [crudMethods, commandMethods].filter(Boolean).join('\n')
  const hasMethods = methodBody.trim().length > 0

  // A resource may declare no operations in the manifest. Its client is still
  // exposed (e.g. `client.windows`) as a typed placeholder, but emitting unused
  // private fields / type imports would trip strict `noUnusedLocals`. Guard the
  // class body so the empty case stays clean under strict TypeScript.
  if (!hasMethods) {
    return `/**
 * ${resourceName} client for ${manifest.app.name} SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';

/**
 * Client for ${resource.description.toLowerCase()}.
 *
 * This resource has no operations defined in the manifest yet.
 */
export class ${resourceName}ResourceClient {
  constructor(_http: HttpClient, _app: string, _resource: string) {
    // No operations available for this resource.
  }
}
`
  }

  // Merge the resource's own types with any extra referenced types into a single
  // import from '../types.js' for clean, deterministic output. The Create/Update
  // input types are only referenced when the matching command exists.
  const typeImports = [
    ...(usesOwnType ? [resourceName] : []),
    ...(createCmd ? [`${resourceName}CreateInput`] : []),
    ...(updateCmd ? [`${resourceName}UpdateInput`] : []),
    ...Array.from(extraTypeImports).sort(),
  ]

  // The types import is omitted entirely when no emitted method references a
  // type (e.g. a resource whose only operation is a void, parameter-less command).
  const typesImportLine =
    typeImports.length > 0 ? `\nimport type { ${typeImports.join(', ')} } from '../types.js';` : ''

  return `/**
 * ${resourceName} client for ${manifest.app.name} SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';${typesImportLine}

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
${methodBody}
}
`
}

/**
 * Get the first-parameter name for a get/update/delete command, falling back to
 * the resource's primary identifier and finally `id`. The server validates the
 * request body against the command's declared parameters, so the SDK must use
 * the command's parameter name when present.
 */
function idParamName(command: Command, primaryId: string | undefined): string {
  return command.parameters[0]?.name ?? primaryId ?? 'id'
}

/**
 * Generate the `list` method, routed by the backing command's key.
 */
function generateListMethod(commandKey: string, resourceName: string, plural: string): string {
  return `
  /**
   * List all ${plural}.
   */
  async list(): Promise<${resourceName}[]> {
    return this.#http.rpc<${resourceName}[]>(\`\${this.#app}.\${this.#resource}.${commandKey}\`);
  }
`
}

/**
 * Generate the `get` method, routed by the backing command's key.
 */
function generateGetMethod(
  commandKey: string,
  command: Command,
  resourceName: string,
  nameLower: string,
  primaryId: string | undefined
): string {
  const id = idParamName(command, primaryId)
  return `
  /**
   * Get a ${nameLower} by ${id}.
   */
  async get(${id}: string): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${commandKey}\`, { ${id} });
  }
`
}

/**
 * Generate the `create` method, routed by the backing command's key.
 *
 * The single-object input keeps the SDK ergonomic and the MCP/CLI call shape
 * stable. `${resourceName}CreateInput` now includes any identifier parameters the
 * backing create command requires (e.g. an Event's `calendarId`), so the input
 * carries everything the server validates against — reconciling the previous
 * param-name drift where the property-derived input omitted `calendarId`.
 */
function generateCreateMethod(
  commandKey: string,
  _command: Command,
  resourceName: string,
  nameLower: string
): string {
  return `
  /**
   * Create a new ${nameLower}.
   */
  async create(input: ${resourceName}CreateInput): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${commandKey}\`, input);
  }
`
}

/**
 * Generate the `update` method, routed by the backing command's key.
 */
function generateUpdateMethod(
  commandKey: string,
  command: Command,
  resourceName: string,
  nameLower: string,
  primaryId: string | undefined
): string {
  const id = idParamName(command, primaryId)
  return `
  /**
   * Update an existing ${nameLower}.
   */
  async update(${id}: string, input: ${resourceName}UpdateInput): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${commandKey}\`, { ${id}, ...input });
  }
`
}

/**
 * Generate the `delete` method, routed by the backing command's key.
 */
function generateDeleteMethod(
  commandKey: string,
  command: Command,
  nameLower: string,
  primaryId: string | undefined
): string {
  const id = idParamName(command, primaryId)
  return `
  /**
   * Delete a ${nameLower}.
   */
  async delete(${id}: string): Promise<void> {
    await this.#http.rpc<undefined>(\`\${this.#app}.\${this.#resource}.${commandKey}\`, { ${id} });
  }
`
}

/**
 * Build a method signature parameter list and request-body argument from a
 * command's declared parameters. Required parameters are sorted first; reserved
 * identifiers are made safe; the body forwards parameters under their manifest
 * names so the server schema validates them.
 */
function buildParamsAndBody(command: Command): { signature: string; bodyArg: string } {
  const sortedParams = [...command.parameters].sort((a, b) => {
    if (a.required && !b.required) return -1
    if (!a.required && b.required) return 1
    return 0
  })
  const signature = sortedParams
    .map((p) => {
      const tsType = propertyTypeToTs(
        typeof p.type === 'string' ? (p.type as PropertyType) : 'string'
      )
      const optional = !p.required ? '?' : ''
      return `${safeIdentifier(p.name)}${optional}: ${tsType}`
    })
    .join(', ')

  const bodyProps = command.parameters
    .map((p) => {
      const safeName = safeIdentifier(p.name)
      return safeName === p.name ? safeName : `'${p.name}': ${safeName}`
    })
    .join(', ')
  const bodyArg = bodyProps ? `{ ${bodyProps} }` : '{}'

  return { signature, bodyArg }
}

/**
 * Generate method for a non-CRUD resource-level command.
 *
 * The route is keyed by the command's manifest key (`commandKey`), the same
 * value the server router uses — addressing by `command.name` is what broke the
 * structured path. CRUD-shaped commands are emitted separately by
 * `generateResourceClient`, so they are skipped here.
 */
function generateResourceCommandMethod(commandKey: string, cmd: Command): string {
  // Skip standard CRUD commands as they're already generated
  if (isCrudName(cmd.name)) {
    return ''
  }

  const { signature, bodyArg } = buildParamsAndBody(cmd)

  const returnType = cmd.returns ? propertyTypeToTs(cmd.returns as PropertyType) : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const rpcCall = needsAwait
    ? `await this.#http.rpc<${rpcReturnType}>(\`\${this.#app}.\${this.#resource}.${commandKey}\`, ${bodyArg});`
    : `return this.#http.rpc<${rpcReturnType}>(\`\${this.#app}.\${this.#resource}.${commandKey}\`, ${bodyArg});`

  return `
  /**
   * ${cmd.description}
   */
  async ${safeIdentifier(cmd.name)}(${signature}): Promise<${returnType}> {
    ${rpcCall}
  }
`
}

/**
 * Generate index file.
 */
function generateIndexFile(manifest: AppManifest, appName: string): string {
  const resourceExports = Object.keys(manifest.resources)
    .filter((r) => resourceHasOperations(manifest, r))
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
