/**
 * QuickTimePlayer HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { quickTimePlayerContract as appContract } from './contract/index.js'
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
import type { QuickTimePlayerResources } from './contract/index.js'

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
export interface QuickTimePlayerClientOptions {
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
    const contract: AppContract<object, QuickTimePlayerResources> = {
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
    const legacy = new QuickTimePlayerError(
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
 * Error class for QuickTimePlayer API errors.
 */
export class QuickTimePlayerError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'QuickTimePlayerError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface QuickTimePlayerClient extends ClientBrand<QuickTimePlayerResources> {}

/**
 * QuickTimePlayer client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new QuickTimePlayerClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class QuickTimePlayerClient {
  readonly #httpClient: HttpClient

  constructor(options: QuickTimePlayerClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)

    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Open a URL.
   */
  async openURL(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('quicktime-player.app.openURL', {}, __mactsOptions)
  }

  /**
   * Play the movie.
   */
  async play(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('quicktime-player.app.play', {}, __mactsOptions)
  }

  /**
   * Start the movie recording.
   */
  async start(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('quicktime-player.app.start', {}, __mactsOptions)
  }

  /**
   * Pause the recording.
   */
  async pause(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('quicktime-player.app.pause', {}, __mactsOptions)
  }

  /**
   * Resume the recording.
   */
  async resume(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('quicktime-player.app.resume', {}, __mactsOptions)
  }

  /**
   * Stop the movie or recording.
   */
  async stop(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('quicktime-player.app.stop', {}, __mactsOptions)
  }

  /**
   * Step the movie backward the specified number of steps (default is 1).
   */
  async stepBackward(
    by?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.stepBackward',
      { ...(by === undefined ? {} : { by: __mactsIntegerInput(by) }) },
      __mactsOptions
    )
  }

  /**
   * Step the movie forward the specified number of steps (default is 1).
   */
  async stepForward(
    by?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.stepForward',
      { ...(by === undefined ? {} : { by: __mactsIntegerInput(by) }) },
      __mactsOptions
    )
  }

  /**
   * Trim the movie.
   */
  async trim(
    from: number,
    to: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.trim',
      { from, to },
      __mactsOptions
    )
  }

  /**
   * Present the document full screen.
   */
  async present(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('quicktime-player.app.present', {}, __mactsOptions)
  }

  /**
   * Create a new movie recording document.
   */
  async newMovieRecording(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.newMovieRecording',
      {},
      __mactsOptions
    )
  }

  /**
   * Create a new audio recording document.
   */
  async newAudioRecording(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.newAudioRecording',
      {},
      __mactsOptions
    )
  }

  /**
   * Create a new screen recording document.
   */
  async newScreenRecording(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.newScreenRecording',
      {},
      __mactsOptions
    )
  }

  /**
   * Export a movie to another file
   */
  async _export(
    _in: Parameters<import('./contract/index.js').QuickTimePlayerClient['_export']>[0],
    usingSettingsPreset: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.export',
      { in: _in, usingSettingsPreset },
      __mactsOptions
    )
  }

  /**
   * Show the document's Remote HUD
   */
  async showRemoteHud(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'quicktime-player.app.showRemoteHud',
      {},
      __mactsOptions
    )
  }
}
