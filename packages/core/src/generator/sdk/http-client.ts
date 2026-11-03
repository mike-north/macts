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
import {
  CANONICAL_IDENTIFIER_KEY,
  listOperationPages,
  normalizeResourceRouteSegment,
  resolveCanonicalIdentifierSource,
  commandRouteSegment,
} from '../../manifest/index.js'
import { usableResources } from '../../manifest/unsupported.js'
import { outputProperties } from '../../manifest/output-references.js'
import { propertyTypeToTs } from '../types.js'
import { SDK_GENERATED_NOTICE } from '../generated-header.js'
import { pagingTypeNames } from '../contract/index.js'
import {
  appCommandEntries,
  commandMethodParameters,
  createInputFields,
  findCrudCommand,
  identifierWords,
  isCrudName,
  listMethodParameters,
  resolveIdParams,
  resourceCommandEntries,
  resourceHasOperations,
  resourceNamespace,
  safeIdentifier,
  type CrudOperation,
} from '../surface.js'
import {
  isOperationAvailable,
  omittedInputs,
  omittedResourceInputs,
} from '../input-satisfiability.js'

/** One field line of a generated input type. */
interface InputFieldLine {
  readonly tsType: string
  readonly required: boolean
  readonly doc: string
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
    for (const [resourceName, resource] of usableResources(manifest)) {
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
  // The Zod schemas below are the only use of `z`; a manifest whose every
  // resource is marked unsupported has none, and an unused import fails the
  // generated package's type check.
  const resources = usableResources(manifest)
  const lines: string[] = [
    '/**',
    ' * Type definitions for the SDK.',
    ` * ${SDK_GENERATED_NOTICE}`,
    ' */',
    '',
    ...(resources.length > 0 ? ['import { z } from "zod";', ''] : []),
  ]

  // Generate enum types
  for (const [enumName, enumDef] of Object.entries(manifest.enums)) {
    lines.push(`/** ${enumDef.description ?? enumName} */`)
    const values = enumDef.values.map((v) => `'${String(v.value)}'`).join(' | ')
    lines.push(`export type ${enumName} = ${values};`)
    lines.push('')
  }

  // Generate resource types
  for (const [resourceName, resource] of resources) {
    // The read type declares the fields the contract's record declares: a
    // field holding a reference no caller could resolve is left out
    // (`outputProperties`, the judgment the contract and native reads use).
    const props = outputProperties(manifest, resource)

    // List output surfaces the resource's primary identifier under the canonical
    // `id` key (see the server list executor) so a consumer can always read
    // `item.id` to obtain the value sibling get/delete/write operations require,
    // regardless of the app-specific identifier property name. Surface that field
    // on the read type so it is type-visible — unless the manifest already
    // declares a usable property literally named `id` (then `id` is a regular
    // property; one marked unsupported is not a field, so the alias is emitted).
    //
    // The value mirrors the RUNTIME targeting property, not necessarily the
    // declared identifier: a `byProperty` resource (e.g. Calendar, whose declared
    // `calendarIdentifier` throws via JXA) surfaces its working property (`name`),
    // since that is the value get/delete/create accept as the lookup.
    const idProperty = resolveCanonicalIdentifierSource(resource)
    const emitCanonicalId = idProperty !== undefined

    lines.push(`/** ${resource.description} */`)
    if (props.length === 0 && !emitCanonicalId) {
      // Use Record<string, never> for resources with no properties
      lines.push(`export type ${resourceName} = Record<string, never>;`)
    } else {
      lines.push(`export interface ${resourceName} {`)
      if (emitCanonicalId) {
        // Optional on the type: `list` always populates it (the value sibling
        // operations require), but other read paths (get/create returns) may
        // surface only the app-specific identifier property.
        lines.push(
          `  /** Canonical identifier (mirrors \`${idProperty}\`); populated by list, pass to get/delete and to write operations that reference this resource. */`
        )
        lines.push(`  ${CANONICAL_IDENTIFIER_KEY}?: string;`)
      }
      for (const [propName, prop] of props) {
        const tsType = propertyTypeToTs(prop.type)
        const optional = prop.optional ? '?' : ''
        lines.push(`  /** ${prop.description} */`)
        lines.push(`  ${propName}${optional}: ${tsType};`)
      }
      lines.push('}')
    }
    lines.push('')

    // Generate create input type: the resource's writable properties plus the
    // backing create command's parameters (see `createInputFields`), less the
    // fields that admit no value (`omittedResourceInputs`, the judgment the
    // contract's input types use), whether or not the resource has a create
    // command.
    //
    // A parameter's `type` is `string | Record<string, string>` from the schema.
    // When it is an object it is structurally compatible with `PropertyType`
    // (e.g. `{ enum: 'EventStatus' }`, `{ array: 'date' }`), so it is cast
    // directly rather than falling back to 'string', which would widen enum and
    // array types unnecessarily.
    const createFields = new Map<string, InputFieldLine>()
    const updateFields = new Map<string, InputFieldLine>()
    const omitted = omittedResourceInputs(manifest, resourceName)
    for (const [fieldName, field] of createInputFields(manifest, resourceName)) {
      const line = {
        tsType: propertyTypeToTs(field.type as PropertyType | undefined),
        required: field.required,
        doc: field.description,
      }
      if (!omitted.create.has(fieldName)) createFields.set(fieldName, line)
      if (!omitted.update.has(fieldName)) updateFields.set(fieldName, { ...line, required: false })
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

    // Generate update input type: every update field is optional, so it is
    // the partial create input unless the two leave out different fields (a
    // required create field that admits no value, or a resettable one that
    // admits only null).
    lines.push(`/** Input for updating a ${resourceName} */`)
    const sameFields =
      updateFields.size === createFields.size &&
      [...updateFields.keys()].every((name) => createFields.has(name))
    if (sameFields) {
      lines.push(`export type ${resourceName}UpdateInput = Partial<${resourceName}CreateInput>;`)
    } else if (updateFields.size === 0) {
      lines.push(`export type ${resourceName}UpdateInput = Record<string, never>;`)
    } else {
      lines.push(`export interface ${resourceName}UpdateInput {`)
      for (const [fieldName, field] of updateFields) {
        lines.push(`  /** ${field.doc} */`)
        lines.push(`  ${fieldName}?: ${field.tsType};`)
      }
      lines.push('}')
    }
    lines.push('')
  }

  // Generate Zod schemas for runtime validation
  if (resources.length > 0) {
    lines.push('// Zod schemas for runtime validation')
    lines.push('')
  }
  for (const [resourceName, resource] of resources) {
    // Mirror the canonical `id` field added to the read type, so runtime
    // validation accepts the identifier the list output surfaces. Uses the same
    // runtime-targeting-aware resolution as the read type above.
    const emitCanonicalId = resolveCanonicalIdentifierSource(resource) !== undefined

    lines.push(`export const ${resourceName}Schema = z.object({`)
    if (emitCanonicalId) {
      lines.push(`  ${CANONICAL_IDENTIFIER_KEY}: z.string().optional(),`)
    }
    for (const [propName, prop] of outputProperties(manifest, resource)) {
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
  const operationalResources = usableResources(manifest).filter(([name]) =>
    resourceHasOperations(manifest, name)
  )

  const resourceImports = operationalResources
    .map(([r]) => `import { ${r}ResourceClient } from './resources/${r.toLowerCase()}.js';`)
    .join('\n')

  // Find enum and resource types used in app-level commands that must be
  // imported from './types.js' in the generated client file.
  const typesUsedInAppCommands = new Set<string>()
  for (const [, cmd] of availableAppCommands(manifest)) {
    for (const param of cmd.parameters) {
      const paramType = param.type as PropertyType | undefined
      if (typeof paramType === 'object') {
        if ('enum' in paramType) {
          // Enum reference: the type name is the enum's name directly
          typesUsedInAppCommands.add(paramType.enum)
        } else if ('resource' in paramType) {
          // Resource reference: capitalise to match the generated interface name
          const name = paramType.resource.charAt(0).toUpperCase() + paramType.resource.slice(1)
          typesUsedInAppCommands.add(name)
        }
      } else if (typeof paramType === 'string') {
        if (manifest.enums[paramType]) {
          typesUsedInAppCommands.add(paramType)
        }
      }
    }
  }
  const enumImports =
    typesUsedInAppCommands.size > 0
      ? `import type { ${Array.from(typesUsedInAppCommands).join(', ')} } from './types.js';`
      : ''

  const resourceProperties = operationalResources
    .map(([name, resource]) => {
      return `
  /** ${resource.description} */
  readonly ${resourceNamespace(resource)}: ${name}ResourceClient;`
    })
    .join('\n')

  const resourceInitializers = operationalResources
    .map(([name, resource]) => {
      const routeSegment = normalizeResourceRouteSegment(resource.plural)
      return `    this.${resourceNamespace(resource)} = new ${name}ResourceClient(this.#httpClient, '${appNameLower}', '${routeSegment}');`
    })
    .join('\n')

  // Generate app-level command methods
  const appCommands = availableAppCommands(manifest)
    .map(([key, cmd]) => generateAppCommandMethod(commandRouteSegment(key, cmd), cmd, appNameLower))
    .join('\n\n')

  return `/**
 * ${appName} HTTP Client SDK.
 * ${SDK_GENERATED_NOTICE}
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
 * The command as its operation takes it: without the parameters left out
 * because they admit no value (see `../input-satisfiability.ts`), so the client
 * never offers a parameter no request can fill.
 */
function requestCommand(
  manifest: AppManifest,
  command: Command,
  resourceName: string | undefined
): Command {
  const omitted = omittedInputs(manifest, command, resourceName)
  if (omitted.size === 0) return command
  return { ...command, parameters: command.parameters.filter((p) => !omitted.has(p.name)) }
}

/**
 * The application commands whose operations can be called, each as its
 * operation takes it. An operation whose required input admits no value gets
 * no method.
 */
function availableAppCommands(manifest: AppManifest): [string, Command][] {
  return appCommandEntries(manifest)
    .filter(([, cmd]) => isOperationAvailable(manifest, cmd, undefined))
    .map(([key, cmd]) => [key, requestCommand(manifest, cmd, undefined)])
}

/**
 * Generate method for app-level command.
 *
 * The route is keyed by the command's route segment (`commandRouteSegment`: its
 * `routeName`, else its manifest key), matching the server router. Application
 * commands are addressed as `{app}.app.{routeSegment}`.
 */
function generateAppCommandMethod(
  routeSegment: string,
  cmd: Command,
  appNameLower: string
): string {
  const { signature, bodyArg } = buildParamsAndBody(cmd)

  const returnType = cmd.returns ? propertyTypeToTs(cmd.returns as PropertyType) : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const rpcCall = needsAwait
    ? `await this.#httpClient.rpc<${rpcReturnType}>('${appNameLower}.app.${routeSegment}', ${bodyArg});`
    : `return this.#httpClient.rpc<${rpcReturnType}>('${appNameLower}.app.${routeSegment}', ${bodyArg});`

  return `
  /**
   * ${cmd.description}
   */
  async ${safeIdentifier(cmd.name)}(${signature}): Promise<${returnType}> {
    ${rpcCall}
  }`
}

/**
 * Generate resource client file.
 */
function generateResourceClient(
  resourceName: string,
  resource: Resource,
  manifest: AppManifest
): string {
  const nameWords = identifierWords(resource.name)
  const pluralWords = identifierWords(resource.plural)

  const allCommands = resourceCommandEntries(manifest, resourceName)
  // An operation whose required input admits no value gets no method, and
  // every other one takes only the parameters its operation takes.
  const available = (cmd: Command): boolean => isOperationAvailable(manifest, cmd, resourceName)
  const resourceCommands = allCommands
    .filter(([, cmd]) => available(cmd))
    .map(([key, cmd]): [string, Command] => [key, requestCommand(manifest, cmd, resourceName)])

  // Resolve the backing command for each CRUD shape so routes can be keyed by
  // the command's manifest key (the single source of truth shared with the
  // server router) rather than by the operation name. The choice is made among
  // all of the resource's commands, as the contract makes it.
  const crud = (shape: CrudOperation): [string, Command] | undefined => {
    const found = findCrudCommand(allCommands, shape)
    return found !== undefined && available(found[1]) ? found : undefined
  }
  const listCmd = crud('list')
  const getCmd = crud('get')
  const createCmd = crud('create')
  const updateCmd = crud('update')
  const deleteCmd = crud('delete')

  const commandMethods = resourceCommands
    .map(([key, cmd]) => generateResourceCommandMethod(commandRouteSegment(key, cmd), cmd))
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

  const pagingNames = pagingTypeNames(manifest)
  const crudMethods = [
    listCmd
      ? generateListMethod(
          commandRouteSegment(...listCmd),
          listCmd[1],
          resourceName,
          pluralWords,
          listOperationPages(listCmd[1], resource),
          pagingNames
        )
      : '',
    getCmd
      ? generateGetMethod(commandRouteSegment(...getCmd), getCmd[1], resourceName, nameWords)
      : '',
    createCmd
      ? generateCreateMethod(
          commandRouteSegment(...createCmd),
          createCmd[1],
          resourceName,
          nameWords
        )
      : '',
    updateCmd
      ? generateUpdateMethod(
          commandRouteSegment(...updateCmd),
          updateCmd[1],
          resourceName,
          nameWords
        )
      : '',
    deleteCmd
      ? generateDeleteMethod(commandRouteSegment(...deleteCmd), deleteCmd[1], nameWords)
      : '',
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
 * ${SDK_GENERATED_NOTICE}
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

  // A list returns the contract's page type, so the client's pages cannot
  // drift from the contract's.
  const contractsImportLine = listCmd
    ? `import type { ${localImport('Page', pagingNames.page)} } from '@macts/contracts';\n`
    : ''

  return `/**
 * ${resourceName} client for ${manifest.app.name} SDK.
 * ${SDK_GENERATED_NOTICE}
 */

${contractsImportLine}import type { HttpClient } from '../client.js';${typesImportLine}

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
 * Generate the `list` method, routed by the backing command's key.
 *
 * When the list command has required parameters (e.g. a parent `calendarId`),
 * they are included in the method signature and forwarded in the request body —
 * mirroring how get/delete/create thread their identifier params, and matching
 * what the server's `buildListCommandCode` requires to scope the JXA to the
 * parent resource.
 *
 * Identifier resolution follows the same unified path as other CRUD branches:
 * required parameters from the manifest command definition (see
 * `listMethodParameters`), so SDK and server always agree on parameter names.
 * The doc comment of a list under a command parent says it lists the items of
 * one parent.
 *
 * Every list returns one page, of the contract's `Page` type, which the file
 * imports under the local name `pagingNames.page`. A list that pages (see
 * `listOperationPages`) takes a trailing `page` argument whose `pageSize` is
 * sent in its integer wire form and whose `cursor` is sent as given. Any
 * other list takes no paging argument and its page holds every item.
 */
function generateListMethod(
  routeSegment: string,
  command: Command,
  resourceName: string,
  pluralWords: string,
  paged: boolean,
  pagingNames: { readonly page: string }
): string {
  const requiredParams = listMethodParameters(command)
  const page = uniquePageBinding(requiredParams.map((p) => safeIdentifier(p.name)))

  const params = requiredParams.map((p) => {
    const tsType = propertyTypeToTs(p.type as PropertyType)
    return `${safeIdentifier(p.name)}: ${tsType}`
  })
  if (paged) params.push(`${page}: { pageSize?: number; cursor?: string } = {}`)

  const bodyProps = requiredParams.map((p) => {
    const safeName = safeIdentifier(p.name)
    return safeName === p.name ? safeName : `'${p.name}': ${safeName}`
  })
  if (paged) {
    bodyProps.unshift(
      `...(${page}.pageSize === undefined ? {} : { pageSize: { integer: String(${page}.pageSize) } })`,
      `...(${page}.cursor === undefined ? {} : { cursor: ${page}.cursor })`
    )
  }
  const bodyArg = bodyProps.length === 0 ? '' : `, { ${bodyProps.join(', ')} }`
  const returnType = `${pagingNames.page}<${resourceName}>`
  // A list under a command parent returns that parent's items, not all of them.
  const scope =
    command.parent === undefined
      ? undefined
      : `the ${pluralWords} of one ${identifierWords(command.parent.resource)}`
  const listed = scope ?? `all ${pluralWords}`
  const doc = paged
    ? `   * List ${scope ?? pluralWords}, one page at a time. When the result has a \`nextCursor\`,
   * more remain: call again with the same arguments and \`{ cursor: nextCursor }\`.`
    : `   * List ${listed}, as one page.`

  return `
  /**
${doc}
   */
  async list(${params.join(', ')}): Promise<${returnType}> {
    return this.#http.rpc<${returnType}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`${bodyArg});
  }
`
}

/** An import specifier of `imported` under the local name `local`. */
function localImport(imported: string, local: string): string {
  return imported === local ? imported : `${imported} as ${local}`
}

/** The name of a list method's paging argument: `page`, unless a parameter already uses it. */
function uniquePageBinding(taken: readonly string[]): string {
  let name = 'page'
  while (taken.includes(name)) name = `_${name}`
  return name
}

/**
 * Generate the `get` method, routed by the backing command's key.
 *
 * When the command has a parent scope parameter (e.g. `calendarId` on `getEvent`),
 * it is included as the first argument so the server can scope the JXA query to
 * the correct parent collection — e.g. `app.calendars.whose({name:calendarId})[0]
 * .events.byId(id)` instead of the broken `app.events.byId(id)`.
 */
function generateGetMethod(
  routeSegment: string,
  command: Command,
  resourceName: string,
  nameWords: string
): string {
  const { parentParam, childParam } = resolveIdParams(command)
  if (parentParam !== undefined) {
    return `
  /**
   * Get a ${nameWords} by ${childParam} within a parent scope.
   */
  async get(${parentParam}: string, ${childParam}: string): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${parentParam}, ${childParam} });
  }
`
  }
  return `
  /**
   * Get a ${nameWords} by ${childParam}.
   */
  async get(${childParam}: string): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${childParam} });
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
  routeSegment: string,
  _command: Command,
  resourceName: string,
  nameWords: string
): string {
  return `
  /**
   * Create a new ${nameWords}.
   */
  async create(input: ${resourceName}CreateInput): Promise<${resourceName}> {
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, input);
  }
`
}

/**
 * Generate the `update` method, routed by the backing command's key.
 *
 * When the command has a parent scope parameter (e.g. `calendarId` on
 * `updateEvent`), it is the first argument. The request body sends parent param,
 * child id, and then only the defined fields from the update input — filtering
 * out `undefined` values and identifier params so the server schema
 * (`additionalProperties: false`) does not reject the request.
 */
function generateUpdateMethod(
  routeSegment: string,
  command: Command,
  resourceName: string,
  nameWords: string
): string {
  const { parentParam, childParam } = resolveIdParams(command)
  if (parentParam !== undefined) {
    return `
  /**
   * Update an existing ${nameWords} within a parent scope.
   */
  async update(${parentParam}: string, ${childParam}: string, input: ${resourceName}UpdateInput): Promise<${resourceName}> {
    const { ${parentParam}: _p, ...updateFields } = input as ${resourceName}UpdateInput & { ${parentParam}?: string };
    void _p;
    const defined = Object.fromEntries(Object.entries(updateFields as Record<string, unknown>).filter(([, v]) => v !== undefined));
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${parentParam}, ${childParam}, ...defined });
  }
`
  }
  return `
  /**
   * Update an existing ${nameWords}.
   */
  async update(${childParam}: string, input: ${resourceName}UpdateInput): Promise<${resourceName}> {
    const defined = Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([, v]) => v !== undefined));
    return this.#http.rpc<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${childParam}, ...defined });
  }
`
}

/**
 * Generate the `delete` method, routed by the backing command's key.
 *
 * When the command has a parent scope parameter (e.g. `calendarId` on
 * `deleteEvent`), it is the first argument so the server can scope the JXA
 * query to the correct parent collection.
 */
function generateDeleteMethod(routeSegment: string, command: Command, nameWords: string): string {
  const { parentParam, childParam } = resolveIdParams(command)
  if (parentParam !== undefined) {
    return `
  /**
   * Delete an ${nameWords} within a parent scope.
   */
  async delete(${parentParam}: string, ${childParam}: string): Promise<void> {
    await this.#http.rpc<undefined>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${parentParam}, ${childParam} });
  }
`
  }
  return `
  /**
   * Delete an ${nameWords}.
   */
  async delete(${childParam}: string): Promise<void> {
    await this.#http.rpc<undefined>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${childParam} });
  }
`
}

/**
 * Render a command method's signature and request-body argument from the shared
 * surface derivation (`commandMethodParameters`).
 */
function buildParamsAndBody(command: Command): { signature: string; bodyArg: string } {
  const { signature: signatureParams, body } = commandMethodParameters(command)
  const signature = signatureParams
    .map(({ parameter, bindingName, optional }) => {
      const tsType = propertyTypeToTs(parameter.type as PropertyType)
      return `${bindingName}${optional ? '?' : ''}: ${tsType}`
    })
    .join(', ')

  const bodyProps = body
    .map(({ fieldName, bindingName }) =>
      bindingName === fieldName ? bindingName : `'${fieldName}': ${bindingName}`
    )
    .join(', ')
  const bodyArg = bodyProps ? `{ ${bodyProps} }` : '{}'

  return { signature, bodyArg }
}

/**
 * Generate method for a non-CRUD resource-level command.
 *
 * The route is keyed by the command's route segment (`commandRouteSegment`), the same
 * value the server router uses — addressing by `command.name` is what broke the
 * structured path. CRUD-shaped commands are emitted separately by
 * `generateResourceClient`, so they are skipped here.
 */
function generateResourceCommandMethod(routeSegment: string, cmd: Command): string {
  // Skip standard CRUD commands as they're already generated
  if (isCrudName(cmd.name)) {
    return ''
  }

  const { signature, bodyArg } = buildParamsAndBody(cmd)

  const returnType = cmd.returns ? propertyTypeToTs(cmd.returns as PropertyType) : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const rpcCall = needsAwait
    ? `await this.#http.rpc<${rpcReturnType}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, ${bodyArg});`
    : `return this.#http.rpc<${rpcReturnType}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, ${bodyArg});`

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
  const resourceExports = usableResources(manifest)
    .map(([r]) => r)
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
      '@macts/contracts': 'workspace:*',
      zod: 'catalog:',
    },
    devDependencies: {
      tsup: 'catalog:',
      typescript: 'catalog:',
      vitest: 'catalog:',
    },
  }
  return JSON.stringify(pkg, null, 2)
}
