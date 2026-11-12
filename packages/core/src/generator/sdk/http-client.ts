/**
 * HTTP client SDK generator for macts.
 *
 * Generates TypeScript SDK code that communicates with the macts API server
 * via HTTP instead of executing JXA directly.
 *
 * @packageDocumentation
 */

import type { AppManifest, Command, CommandParameter, Resource } from '../../manifest/index.js'
import type { PropertyType } from '../../manifest/schemas/property.js'
import {
  CANONICAL_IDENTIFIER_KEY,
  listOperationPages,
  normalizeResourceRouteSegment,
  resolveCanonicalIdentifierSource,
  resolveParameterNullability,
  commandRouteSegment,
} from '../../manifest/index.js'
import { usableResources } from '../../manifest/unsupported.js'
import { outputProperties } from '../../manifest/output-references.js'
import { propertyTypeToTs } from '../types.js'
import { itemSelectionNote } from '../positional-docs.js'
import { SDK_GENERATED_NOTICE } from '../generated-header.js'
import { contractNames, generateContract, pagingTypeNames } from '../contract/index.js'
import {
  appCommandEntries,
  commandMethodParameters,
  createInputFields,
  findCrudCommand,
  generationRefusals,
  firstMatchNote,
  resourceCommandNotes,
  describedSentences,
  identifierWords,
  isCrudName,
  listMethodParameters,
  parentFirstMatchNote,
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
  const refusals = generationRefusals(manifest)
  if (refusals.length > 0) return { files: [], errors: refusals }
  const files: { path: string; content: string }[] = []
  const errors: string[] = []
  const appName = manifest.app.name.replace(/\s+/g, '')
  const appNameLower = contractNames(manifest).app
  const baseUrl = options.defaultBaseUrl ?? DEFAULT_BASE_URL
  const port = options.defaultPort ?? DEFAULT_PORT

  try {
    const contract = generateContract(manifest)
    files.push(...contract.files)
    errors.push(...contract.errors)

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
  for (const enumName of Object.keys(manifest.enums)) {
    lines.push(`export type { ${enumName} } from './contract/index.js';`)
    lines.push('')
  }

  // Generate resource types
  for (const [resourceName] of resources) {
    lines.push(`/** Canonical SDK record; typed operations decode through the app contract. */`)
    lines.push(`export type { ${resourceName} } from './contract/index.js';`)
    lines.push('')

    for (const kind of ['create', 'update'] as const) {
      const inputName = `${resourceName}${kind === 'create' ? 'Create' : 'Update'}Input`
      const canonical = `import('./contract/index.js').${inputName}`
      const omitted = omittedResourceInputs(manifest, resourceName)[kind]
      const fields = createInputFields(manifest, resourceName)
      const update =
        kind === 'update'
          ? findCrudCommand(resourceCommandEntries(manifest, resourceName), 'update')
          : undefined
      const addressing = update === undefined ? undefined : resolveIdParams(update[1])
      const positional = new Set([addressing?.parentParam, addressing?.childParam])
      const parent = addressing?.parentParam
      const parentField = parent === undefined ? undefined : fields.get(parent)
      // Legacy update inputs may repeat the parent, but the positional parent
      // remains authoritative and the method discards this redundant field.
      const parentCompatibility =
        parentField === undefined
          ? ''
          : ` & { /** Redundant parent; the positional argument owns scope. */ ${JSON.stringify(parent)}?: ${propertyTypeToTs(parentField.type as PropertyType)}; }`

      const numbers = [...fields].filter(
        ([name, field]) =>
          !omitted.has(name) &&
          !positional.has(name) &&
          containsInteger(field.type as PropertyType | undefined)
      )
      lines.push(`/** Canonical ${kind} input, retaining checked numeric conveniences. */`)
      if (numbers.length === 0) {
        lines.push(
          parentCompatibility === ''
            ? `export type { ${inputName} } from './contract/index.js';`
            : `export type ${inputName} = ${canonical}${parentCompatibility};`
        )
      } else {
        const keys = numbers.map(([name]) => JSON.stringify(name)).join(' | ')
        lines.push(`export type ${inputName} = Omit<${canonical}, ${keys}> & {`)
        for (const [name, field] of numbers) {
          const optional = kind === 'update' || !field.required ? '?' : ''
          lines.push(
            `  /** ${field.description} Numeric values are validated by the contract before dispatch. */`
          )
          // Only numbers and arrays of numbers are widened. Reference identities,
          // dates, nullability, omission and all other input fields stay canonical.
          lines.push(
            `  ${JSON.stringify(name)}${optional}: null extends ${canonical}[${JSON.stringify(name)}] ? ${propertyTypeToTs(field.type as PropertyType)} | null : ${propertyTypeToTs(field.type as PropertyType)};`
          )
        }
        lines.push(`}${parentCompatibility};`)
      }
      lines.push('')
    }
  }

  // Generate Zod schemas for runtime validation
  if (resources.length > 0) {
    lines.push(
      '// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.'
    )
    lines.push('')
  }
  for (const [resourceName, resource] of resources) {
    // Mirror the canonical `id` field added to the read type, so runtime
    // validation accepts the identifier the list output surfaces. Uses the same
    // runtime-targeting-aware resolution as the read type above.
    const emitCanonicalId = resolveCanonicalIdentifierSource(resource) !== undefined

    lines.push(
      '/** Raw passthrough validator; typed SDK records use the canonical contract codec. */'
    )
    lines.push(`export const ${resourceName}Schema = z.object({`)
    if (emitCanonicalId) {
      lines.push(`  ${CANONICAL_IDENTIFIER_KEY}: z.string().optional(),`)
    }
    for (const [propName, prop] of outputProperties(manifest, resourceName, resource)) {
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
    .map(([key, cmd]) =>
      generateAppCommandMethod(
        commandRouteSegment(key, cmd),
        cmd,
        appNameLower,
        contractNames(manifest).client
      )
    )
    .join('\n\n')

  return `/**
 * ${appName} HTTP Client SDK.
 * ${SDK_GENERATED_NOTICE}
 *
 * @packageDocumentation
 */

${resourceImports}
import { ${contractNames(manifest).contract} as appContract } from './contract/index.js';
import { createCodecClient, createRemoteTransport, type RemoteTransport } from '@macts/contracts/client';
import { MactsError, OperationCancelledError, TransportError, ValidationError, fromWireErrorEnvelope, type AppContract, type CallOptions, type ClientBrand, type ClientRuntime, type OperationId, type WireValue } from '@macts/contracts';
import type { ${contractNames(manifest).resources} } from './contract/index.js';
${integerInputSupport(appCommands)}

/**
 * Client configuration options.
 */
export interface ${appName}ClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: ${baseUrl}:${String(port)}) */
  baseUrl?: string;
}

/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>();

/** Raw RPC compatibility and canonical typed invocation for this app and credential. */
export class HttpClient {
  readonly #transport: RemoteTransport;
  #runtime: ClientRuntime | undefined;

  constructor(baseUrl: string, apiKey: string) {
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey });
  }

  /**
   * Bind the actual public facade in the shared reference registry. Standalone
   * resource clients lazily bind an ordinary contract client instead. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind(client?: object): void {
    const contract: AppContract<object, ${contractNames(manifest).resources}> = {
      ...appContract,
      bind: runtime => { this.#runtime = runtime; return client ?? appContract.bind(runtime); },
    };
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          return await this.rpc(operation, input as object, options);
        } catch (error) {
          if (error instanceof MactsError) throw error;
          if (error instanceof Error) {
            const canonical = canonicalFailures.get(error);
            if (canonical !== undefined) throw canonical;
          }
          if (options?.signal?.aborted === true) throw new OperationCancelledError('The operation was cancelled.', {});
          throw new TransportError('The custom RPC transport failed.', { reason: 'unreachable' });
        }
      },
      resolve: this.#transport.resolve,
    });
  }

  /** Invoke a descriptor with SDK input; generated return types come from that contract and its output codec validates the result. @internal */
  async invoke<T>(path: string, input: object = {}, options?: CallOptions, expectedResource?: string): Promise<T> {
    const operation = Object.values(appContract.operations).find(candidate => candidate.id === path);
    if (operation === undefined || operation.unavailable !== undefined || (expectedResource !== undefined && operation.target.resource !== expectedResource)) {
      throw new ValidationError('The operation is not registered in this app contract.', { issues: [{ path: [], message: 'Unknown or mismatched operation route.' }] });
    }
    if (this.#runtime === undefined) this.bind();
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.');
    return this.#runtime.invoke(operation, input, options) as Promise<T>;
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers dispatch through this public hook, including overrides
    // that forward only two arguments. Shared protocol handling needs no hidden
    // request metadata; forwarding options preserves cancellation only.
    const outcome = await this.#transport.requestRpc(path as OperationId, body as WireValue, options);
    if (outcome.ok) return outcome.result as T;
    const error = outcome.envelope as { error?: { code?: string; message?: string } } | null;
    const legacy = new ${appName}Error(error?.error?.code ?? 'UNKNOWN_ERROR', error?.error?.message ?? \`HTTP \${String(outcome.status)}\`);
    canonicalFailures.set(legacy, fromWireErrorEnvelope(outcome.envelope, { status: outcome.status }));
    throw legacy;
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
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface ${appName}Client extends ClientBrand<${contractNames(manifest).resources}> {}

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
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class ${appName}Client {
  readonly #httpClient: HttpClient;
${resourceProperties}

  constructor(options: ${appName}ClientOptions) {
    const baseUrl = options.baseUrl ?? '${baseUrl}:${String(port)}';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
${resourceInitializers}
    this.#httpClient.bind(this);
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }
${operationCallOptions(appCommands)}
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
  appNameLower: string,
  canonicalClient: string
): string {
  const { signature, bodyArg } = buildParamsAndBody(
    cmd,
    `import('./contract/index.js').${canonicalClient}['${safeIdentifier(cmd.name)}']`
  )

  const returnType = cmd.returns
    ? `Awaited<ReturnType<import('./contract/index.js').${canonicalClient}['${safeIdentifier(cmd.name)}']>>`
    : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const rpcCall = needsAwait
    ? `await this.#httpClient.invoke<${rpcReturnType}>('${appNameLower}.app.${routeSegment}', ${bodyArg});`
    : `return this.#httpClient.invoke<${rpcReturnType}>('${appNameLower}.app.${routeSegment}', ${bodyArg});`

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
    .map(([key, cmd]) =>
      generateResourceCommandMethod(
        commandRouteSegment(key, cmd),
        cmd,
        resourceName,
        resourceCommandNotes(cmd, resource, manifest)
      )
    )
    .join('\n')

  // The resource's own type is referenced by the CRUD methods' return types
  // (list/get/create/update). It may also be referenced by a non-CRUD command's
  // parameter or return type. Only import it when something actually uses it,
  // otherwise strict `noUnusedLocals` rejects the generated file.
  const usesOwnType = Boolean(listCmd ?? getCmd ?? createCmd ?? updateCmd)

  const pagingNames = pagingTypeNames(manifest)
  // The first-match sentences of an operation: the item's, for one that
  // selects an item, then its parent's.
  const notesOf = (command: Command, selectsItem: boolean): string[] =>
    [
      selectsItem ? firstMatchNote(resource) : undefined,
      parentFirstMatchNote(command, manifest),
      selectsItem ? itemSelectionNote(manifest, resourceName) : undefined,
    ].filter((note): note is string => note !== undefined)
  const crudMethods = [
    listCmd
      ? generateListMethod(
          commandRouteSegment(...listCmd),
          listCmd[1],
          resourceName,
          pluralWords,
          listOperationPages(listCmd[1], resource),
          pagingNames,
          notesOf(listCmd[1], false)
        )
      : '',
    getCmd
      ? generateGetMethod(
          commandRouteSegment(...getCmd),
          getCmd[1],
          resourceName,
          nameWords,
          notesOf(getCmd[1], true)
        )
      : '',
    createCmd
      ? generateCreateMethod(
          commandRouteSegment(...createCmd),
          createCmd[1],
          resourceName,
          nameWords,
          notesOf(createCmd[1], false)
        )
      : '',
    updateCmd
      ? generateUpdateMethod(
          commandRouteSegment(...updateCmd),
          updateCmd[1],
          resourceName,
          nameWords,
          notesOf(updateCmd[1], true)
        )
      : '',
    deleteCmd
      ? generateDeleteMethod(
          commandRouteSegment(...deleteCmd),
          deleteCmd[1],
          nameWords,
          notesOf(deleteCmd[1], true)
        )
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

  // CRUD records and numeric input conveniences live in types.ts. Other method
  // types come directly from the canonical contract, with no duplicate mapping.
  const typeImports = [
    ...(usesOwnType ? [resourceName] : []),
    ...(createCmd ? [`${resourceName}CreateInput`] : []),
    ...(updateCmd ? [`${resourceName}UpdateInput`] : []),
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
${integerInputSupport(methodBody)}

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
${operationCallOptions(methodBody, resourceName)}
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
 * validated as an SDK integer and whose `cursor` is sent as given. Any
 * other list takes no paging argument and its page holds every item. A
 * required `integer` parameter is taken as a number and sent in the same
 * checked SDK integer form before the shared codec encodes it.
 */
function generateListMethod(
  routeSegment: string,
  command: Command,
  resourceName: string,
  pluralWords: string,
  paged: boolean,
  pagingNames: { readonly page: string },
  notes: readonly string[]
): string {
  const requiredParams = listMethodParameters(command)
  const page = uniquePageBinding(requiredParams.map((p) => safeIdentifier(p.name)))

  const params = requiredParams.map((p, index) => {
    const tsType = convenienceParameterType(
      p,
      `import('../contract/index.js').${resourceName}ResourceClient['list']`,
      index
    )
    return `${safeIdentifier(p.name)}: ${tsType}`
  })
  if (paged) params.push(`${page}: { pageSize?: number; cursor?: string } = {}`)

  // Required integer parameters and page size are checked before the shared
  // SDK encoder turns their numeric values into canonical wire controls.
  const bodyProps = requiredParams.map((p) =>
    bodyField({
      name: p.name,
      binding: safeIdentifier(p.name),
      integer: p.type === 'integer',
      nullable: resolveParameterNullability(p).nullable,
    })
  )
  if (paged) {
    bodyProps.unshift(
      `...(${page}.pageSize === undefined ? {} : { pageSize: ${integerInput(`${page}.pageSize`)} })`,
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
${doc}${docNoteLines(notes)}
   */
  async list(${params.join(', ')}): Promise<${returnType}> {
    return this.#http.invoke<${returnType}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`${bodyArg});
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
 * The doc comment lines a method that acts on one item, or within a parent,
 * adds for its `notes` ({@link firstMatchNote}, {@link parentFirstMatchNote},
 * or a resource command's {@link resourceCommandNotes}), one per note, or
 * nothing when there are none.
 */
function docNoteLines(notes: readonly string[]): string {
  return notes.map((note) => `\n   * ${note}`).join('')
}

/**
 * Generate the `get` method, routed by the backing command's key.
 *
 * When the command has a parent scope parameter (e.g. `calendarId` on `getEvent`),
 * it is included as the first argument so the server can scope the JXA query to
 * the correct parent collection — e.g. `app.calendars.whose({name:calendarId})[0]
 * .events.byId(id)` instead of the broken `app.events.byId(id)`.
 *
 * Integer identifiers are checked before the shared codec encodes them
 * ({@link bodyField}); other identifiers retain their declared addressing text.
 */
function generateGetMethod(
  routeSegment: string,
  command: Command,
  resourceName: string,
  nameWords: string,
  notes: readonly string[]
): string {
  const { parentParam, childParam } = resolveIdParams(command)
  const noteLine = docNoteLines(notes)
  const field = (name: string): string => identifierField(command, name)
  if (parentParam !== undefined) {
    return `
  /**
   * Get a ${nameWords} by ${childParam} within a parent scope.${noteLine}
   */
  async get(${parentParam}: ${identifierType(command, parentParam)}, ${childParam}: ${identifierType(command, childParam)}): Promise<${resourceName}> {
    return this.#http.invoke<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${field(parentParam)}, ${field(childParam)} });
  }
`
  }
  return `
  /**
   * Get a ${nameWords} by ${childParam}.${noteLine}
   */
  async get(${childParam}: ${identifierType(command, childParam)}): Promise<${resourceName}> {
    return this.#http.invoke<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${field(childParam)} });
  }
`
}

/**
 * A checked SDK integer expression. CLI text is admitted only after canonical
 * decimal validation; the shared input codec supplies its wire form once.
 */
function integerInput(value: string): string {
  return `__mactsIntegerInput(${value})`
}

/**
 * Emit validation only in modules that send integer inputs. The shared value
 * contract owns canonical decimal syntax and safe bounds; this compatibility
 * client accepts CLI text without rounding it or widening that domain.
 * Failures use the canonical SDK error before the HTTP layer sees a body.
 */
function integerInputSupport(methods: string): string {
  if (!methods.includes('__mactsIntegerInput(')) return ''
  return `
import { Integer as __mactsInteger, ValueTypes as __mactsValueTypes, ValidationError as __mactsValidationError } from '@macts/contracts';

/** Integer wire policy shared with the operation contracts, built once per module. */
const __mactsIntegerWire = __mactsValueTypes.integer().wire;

/** Validate CLI text or an SDK number before dispatch, without implicit rounding. */
function __mactsIntegerInput(value: unknown): __mactsInteger {
  const integer = typeof value === 'number' || typeof value === 'string' ? String(value) : undefined;
  const candidate = { integer };
  if (!__mactsIntegerWire.safeParse(candidate).success || integer === undefined) {
    const message = 'Expected a canonical decimal integer from -9007199254740991 to 9007199254740991.';
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] });
  }
  return __mactsInteger.validate(Number(integer));
}
`
}

/** What {@link bodyField} needs to know about one request-body field. */
interface BodyFieldSpec {
  /** The field's key in the request body: the parameter's manifest name. */
  readonly name: string
  /** The generated local holding the field's value. */
  readonly binding: string
  /** Whether the parameter is declared `integer`. */
  readonly integer: boolean
  /** Whether the value may be absent; an absent value sends no field. */
  readonly optional?: boolean
  /** Whether declared semantic null passes through unchanged. */
  readonly nullable?: boolean
}

/**
 * One request-body field of a generated client method, as object-literal
 * text. Every input the generated client sends goes through it: a get's,
 * update's or delete's identifiers, a list's parameters, and a command's
 * parameters, a resource command's item included.
 *
 * Integer conveniences are checked SDK values ({@link integerInput}); the
 * codec performs wire encoding once. Omitted optional integers stay omitted,
 * and declared semantic null passes through without numeric coercion.
 */
function bodyField({
  name,
  binding,
  integer,
  optional = false,
  nullable = false,
}: BodyFieldSpec): string {
  const key = binding === name ? name : `'${name}'`
  if (!integer) return binding === name ? binding : `${key}: ${binding}`
  const value = nullable
    ? `${binding} === null ? null : ${integerInput(binding)}`
    : integerInput(binding)
  const field = `${key}: ${value}`
  return optional ? `...(${binding} === undefined ? {} : { ${field} })` : field
}

/**
 * The request-body field of the identifier parameter `name` of `command`, a
 * get, update or delete, bound to a local of the same name.
 */
function identifierField(command: Command, name: string): string {
  const parameter = command.parameters.find((p) => p.name === name)
  return bodyField({
    name,
    binding: name,
    integer: isIntegerParameter(command, name),
    nullable: parameter !== undefined && resolveParameterNullability(parameter).nullable,
  })
}

/**
 * The TypeScript type of a get's, update's or delete's identifier argument. An `integer` identifier
 * accepts a number or canonical CLI text, checked before SDK encoding. Other
 * identifiers retain their text, including path-addressed keys.
 */
function identifierType(command: Command, name: string): string {
  const parameter = command.parameters.find((p) => p.name === name)
  const nullable =
    parameter !== undefined && resolveParameterNullability(parameter).nullable ? ' | null' : ''
  return (isIntegerParameter(command, name) ? 'string | number' : 'string') + nullable
}

/** Whether `command` declares the parameter `name` as an `integer`. */
function isIntegerParameter(command: Command, name: string): boolean {
  return command.parameters.find((p) => p.name === name)?.type === 'integer'
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
  nameWords: string,
  notes: readonly string[]
): string {
  return `
  /**
   * Create a new ${nameWords}.${docNoteLines(notes)}
   */
  async create(input: ${resourceName}CreateInput): Promise<${resourceName}> {
    return this.#http.invoke<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, input);
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
  nameWords: string,
  notes: readonly string[]
): string {
  const { parentParam, childParam } = resolveIdParams(command)
  const noteLine = docNoteLines(notes)
  if (parentParam !== undefined) {
    return `
  /**
   * Update an existing ${nameWords} within a parent scope.${noteLine}
   */
  async update(${parentParam}: ${identifierType(command, parentParam)}, ${childParam}: ${identifierType(command, childParam)}, input: ${resourceName}UpdateInput): Promise<${resourceName}> {
    const { ${parentParam}: _p, ...updateFields } = input as ${resourceName}UpdateInput & { ${parentParam}?: string };
    void _p;
    const defined = Object.fromEntries(Object.entries(updateFields as Record<string, unknown>).filter(([, v]) => v !== undefined));
    return this.#http.invoke<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${identifierField(command, parentParam)}, ${identifierField(command, childParam)}, ...defined });
  }
`
  }
  return `
  /**
   * Update an existing ${nameWords}.${noteLine}
   */
  async update(${childParam}: ${identifierType(command, childParam)}, input: ${resourceName}UpdateInput): Promise<${resourceName}> {
    const defined = Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([, v]) => v !== undefined));
    return this.#http.invoke<${resourceName}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${identifierField(command, childParam)}, ...defined });
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
function generateDeleteMethod(
  routeSegment: string,
  command: Command,
  nameWords: string,
  notes: readonly string[]
): string {
  const { parentParam, childParam } = resolveIdParams(command)
  const noteLine = docNoteLines(notes)
  if (parentParam !== undefined) {
    return `
  /**
   * Delete an ${nameWords} within a parent scope.${noteLine}
   */
  async delete(${parentParam}: ${identifierType(command, parentParam)}, ${childParam}: ${identifierType(command, childParam)}): Promise<void> {
    await this.#http.invoke<undefined>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${identifierField(command, parentParam)}, ${identifierField(command, childParam)} });
  }
`
  }
  return `
  /**
   * Delete an ${nameWords}.${noteLine}
   */
  async delete(${childParam}: ${identifierType(command, childParam)}): Promise<void> {
    await this.#http.invoke<undefined>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, { ${identifierField(command, childParam)} });
  }
`
}

/**
 * Render a command method's signature and request-body argument from the shared
 * surface derivation (`commandMethodParameters`). Each parameter, a resource
 * command's item identifier included, is sent through {@link bodyField}.
 */
function buildParamsAndBody(
  command: Command,
  canonicalMethod: string
): { signature: string; bodyArg: string } {
  const { signature: signatureParams, body } = commandMethodParameters(command)
  const signature = signatureParams
    .map(({ parameter, bindingName, optional }, index) => {
      const tsType = convenienceParameterType(parameter, canonicalMethod, index)
      return `${bindingName}${optional ? '?' : ''}: ${tsType}`
    })
    .join(', ')

  const declared = new Map(command.parameters.map((parameter) => [parameter.name, parameter]))
  const bodyProps = body
    .map(({ fieldName, bindingName }) => {
      const parameter = declared.get(fieldName)
      return bodyField({
        name: fieldName,
        binding: bindingName,
        integer: parameter?.type === 'integer',
        optional: parameter?.required !== true,
        nullable: parameter !== undefined && resolveParameterNullability(parameter).nullable,
      })
    })
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
function generateResourceCommandMethod(
  routeSegment: string,
  cmd: Command,
  resourceName: string,
  notes: readonly string[]
): string {
  // Skip standard CRUD commands as they're already generated
  if (isCrudName(cmd.name)) {
    return ''
  }

  const { signature, bodyArg } = buildParamsAndBody(
    cmd,
    `import('../contract/index.js').${resourceName}ResourceClient['${safeIdentifier(cmd.name)}']`
  )

  const returnType = cmd.returns
    ? `Awaited<ReturnType<import('../contract/index.js').${resourceName}ResourceClient['${safeIdentifier(cmd.name)}']>>`
    : 'void'
  const rpcReturnType = returnType === 'void' ? 'undefined' : returnType
  const needsAwait = returnType === 'void'

  const rpcCall = needsAwait
    ? `await this.#http.invoke<${rpcReturnType}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, ${bodyArg});`
    : `return this.#http.invoke<${rpcReturnType}>(\`\${this.#app}.\${this.#resource}.${routeSegment}\`, ${bodyArg});`

  return `
  /**
   * ${describedSentences(cmd.description, notes).join('\n   * ')}
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
export type { ${contractNames(manifest).resources} } from './contract/index.js';
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

/** Add cancellation after retained positional arguments and keep each resource method tied to its declared target. */
function operationCallOptions(methods: string, expectedResource?: string): string {
  let optionsName = '__mactsOptions'
  while (methods.includes(optionsName)) optionsName = `_${optionsName}`
  return methods
    .replace(
      /async (\w+)\(([^\n]*)\): Promise/g,
      (_match, name: string, parameters: string) =>
        `async ${name}(${parameters}${parameters.length === 0 ? '' : ', '}${optionsName}?: import('@macts/contracts').CallOptions): Promise`
    )
    .split('\n')
    .map((line) => {
      if (!line.includes('.invoke<')) return line
      // Body-less resource lists end at their route template. Every other
      // generated method already supplies an explicit SDK input argument.
      const beforeOptions = line.replace(/\);$/, '')
      const input = beforeOptions.endsWith('`') ? ', {}' : ''
      const resource = expectedResource === undefined ? '' : `, ${JSON.stringify(expectedResource)}`
      return `${beforeOptions}${input}, ${optionsName}${resource});`
    })
    .join('\n')
}

/** Numeric convenience types preserve the old number/number-array call shapes. */
function containsInteger(type: PropertyType | undefined): boolean {
  if (type === 'integer') return true
  return typeof type === 'object' && 'array' in type && containsInteger(type.array)
}

/**
 * Primitive convenience signatures stay readable and numeric inputs retain
 * their established number/array forms. Every other input uses the canonical
 * method parameter type, avoiding record/reference and file/vector type drift.
 */
function convenienceParameterType(
  parameter: CommandParameter,
  canonicalMethod: string,
  index: number
): string {
  const type = parameter.type as PropertyType
  if (
    containsInteger(type) ||
    ['string', 'number', 'boolean', 'date', 'any'].some((primitive) => primitive === type)
  ) {
    return (
      propertyTypeToTs(type) + (resolveParameterNullability(parameter).nullable ? ' | null' : '')
    )
  }
  return `Parameters<${canonicalMethod}>[${String(index)}]`
}
