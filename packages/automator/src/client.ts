/**
 * Automator HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WorkflowResourceClient } from './resources/workflow.js'
import { AutomatorActionResourceClient } from './resources/automatoraction.js'
import { VariableResourceClient } from './resources/variable.js'
import { SettingResourceClient } from './resources/setting.js'
import { RequiredResourceResourceClient } from './resources/requiredresource.js'
import { automatorContract as appContract } from './contract/index.js'
import {
  createCodecClient,
  createRemoteTransport,
  type RemoteTransport,
} from '@macts/contracts/client'
import {
  MactsError,
  OperationCancelledError,
  TransportError,
  ValidationError,
  fromWireErrorEnvelope,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type OperationId,
  type WireValue,
} from '@macts/contracts'
import type { AutomatorResources } from './contract/index.js'

import {
  Integer as __mactsInteger,
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** Integer wire policy shared with the operation contracts, built once per module. */
const __mactsIntegerWire = __mactsValueTypes.integer().wire

/** Validate CLI text or an SDK number before dispatch, without implicit rounding. */
function __mactsIntegerInput(value: unknown): __mactsInteger {
  const integer = typeof value === 'number' || typeof value === 'string' ? String(value) : undefined
  const candidate = { integer }
  if (!__mactsIntegerWire.safeParse(candidate).success || integer === undefined) {
    const message =
      'Expected a canonical decimal integer from -9007199254740991 to 9007199254740991.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return __mactsInteger.validate(Number(integer))
}

/**
 * Client configuration options.
 */
export interface AutomatorClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>()

/** Raw RPC compatibility and canonical typed invocation for this app and credential. */
export class HttpClient {
  readonly #transport: RemoteTransport
  #runtime: ClientRuntime | undefined

  constructor(baseUrl: string, apiKey: string) {
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey })
  }

  /**
   * Bind the actual public facade in the shared reference registry. Standalone
   * resource clients lazily bind an ordinary contract client instead. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind(client?: object): void {
    const contract: AppContract<object, AutomatorResources> = {
      ...appContract,
      bind: (runtime) => {
        this.#runtime = runtime
        return client ?? appContract.bind(runtime)
      },
    }
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          return await this.rpc(operation, input as object, options)
        } catch (error) {
          if (error instanceof MactsError) throw error
          if (error instanceof Error) {
            const canonical = canonicalFailures.get(error)
            if (canonical !== undefined) throw canonical
          }
          if (options?.signal?.aborted === true)
            throw new OperationCancelledError('The operation was cancelled.', {})
          throw new TransportError('The custom RPC transport failed.', { reason: 'unreachable' })
        }
      },
      resolve: this.#transport.resolve,
    })
  }

  /** Invoke a descriptor with SDK input; generated return types come from that contract and its output codec validates the result. @internal */
  async invoke<T>(
    path: string,
    input: object = {},
    options?: CallOptions,
    expectedResource?: string
  ): Promise<T> {
    const operation = Object.values(appContract.operations).find(
      (candidate) => candidate.id === path
    )
    if (
      operation === undefined ||
      operation.unavailable !== undefined ||
      (expectedResource !== undefined && operation.target.resource !== expectedResource)
    ) {
      throw new ValidationError('The operation is not registered in this app contract.', {
        issues: [{ path: [], message: 'Unknown or mismatched operation route.' }],
      })
    }
    if (this.#runtime === undefined) this.bind()
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.')
    return this.#runtime.invoke(operation, input, options) as Promise<T>
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers dispatch through this public hook, including overrides
    // that forward only two arguments. Shared protocol handling needs no hidden
    // request metadata; forwarding options preserves cancellation only.
    const outcome = await this.#transport.requestRpc(
      path as OperationId,
      body as WireValue,
      options
    )
    if (outcome.ok) return outcome.result as T
    const error = outcome.envelope as { error?: { code?: string; message?: string } } | null
    const legacy = new AutomatorError(
      error?.error?.code ?? 'UNKNOWN_ERROR',
      error?.error?.message ?? `HTTP ${String(outcome.status)}`
    )
    canonicalFailures.set(
      legacy,
      fromWireErrorEnvelope(outcome.envelope, { status: outcome.status })
    )
    throw legacy
  }
}

/**
 * Error class for Automator API errors.
 */
export class AutomatorError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AutomatorError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface AutomatorClient extends ClientBrand<AutomatorResources> {}

/**
 * Automator client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new AutomatorClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class AutomatorClient {
  readonly #httpClient: HttpClient

  /** A series of actions stored in a file */
  readonly workflows: WorkflowResourceClient

  /** A single step in a workflow */
  readonly automatorActions: AutomatorActionResourceClient

  /** A variable used by the workflow */
  readonly variables: VariableResourceClient

  /** A named value in an action */
  readonly settings: SettingResourceClient

  /** A resource required for proper operation of the action */
  readonly requiredResources: RequiredResourceResourceClient

  constructor(options: AutomatorClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.workflows = new WorkflowResourceClient(this.#httpClient, 'automator', 'workflows')
    this.automatorActions = new AutomatorActionResourceClient(
      this.#httpClient,
      'automator',
      'automatorActions'
    )
    this.variables = new VariableResourceClient(this.#httpClient, 'automator', 'variables')
    this.settings = new SettingResourceClient(this.#httpClient, 'automator', 'settings')
    this.requiredResources = new RequiredResourceResourceClient(
      this.#httpClient,
      'automator',
      'requiredResources'
    )
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Add an Automator action or variable to a workflow
   */
  async add(
    object: unknown,
    to: unknown,
    atIndex?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'automator.app.add',
      { object, to, ...(atIndex === undefined ? {} : { atIndex: __mactsIntegerInput(atIndex) }) },
      __mactsOptions
    )
  }

  /**
   * Remove an Automator action or variable from a workflow
   */
  async remove(
    object: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('automator.app.remove', { object }, __mactsOptions)
  }
}
