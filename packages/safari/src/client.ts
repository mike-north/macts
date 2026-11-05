/**
 * Safari HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { safariContract as appContract } from './contract/index.js'
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
import type { SafariResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface SafariClientOptions {
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
    const contract: AppContract<object, SafariResources> = {
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
    const legacy = new SafariError(
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
 * Error class for Safari API errors.
 */
export class SafariError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SafariError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface SafariClient extends ClientBrand<SafariResources> {}

/**
 * Safari client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SafariClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class SafariClient {
  readonly #httpClient: HttpClient

  constructor(options: SafariClientOptions) {
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
   * Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.
   */
  async addReadingListItem(
    andPreviewText?: string,
    withTitle?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'safari.app.addReadingListItem',
      { andPreviewText, withTitle },
      __mactsOptions
    )
  }

  /**
   * Applies a string of JavaScript code to a document.
   */
  async doJavaScript(
    _in?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('safari.app.doJavaScript', { in: _in }, __mactsOptions)
  }

  /**
   * Emails the contents of a tab.
   */
  async emailContents(
    _of?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'safari.app.emailContents',
      { of: _of },
      __mactsOptions
    )
  }

  /**
   * Searches the web using Safari's current search provider.
   */
  async searchTheWeb(
    _for: string,
    _in?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'safari.app.searchTheWeb',
      { in: _in, for: _for },
      __mactsOptions
    )
  }

  /**
   * Shows Safari's bookmarks.
   */
  async showBookmarks(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('safari.app.showBookmarks', {}, __mactsOptions)
  }

  /**
   * Show Safari Extensions preferences.
   */
  async showExtensionsPreferences(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'safari.app.showExtensionsPreferences',
      {},
      __mactsOptions
    )
  }

  /**
   * Dispatch a message to a Safari Extension.
   */
  async dispatchMessageToExtension(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'safari.app.dispatchMessageToExtension',
      {},
      __mactsOptions
    )
  }

  /**
   * Make sure that all in-memory structures are in-sync with their on-disk counterparts.
   */
  async syncAllPlistToDisk(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('safari.app.syncAllPlistToDisk', {}, __mactsOptions)
  }

  /**
   * Show Safari's Privacy Report
   */
  async showPrivacyReport(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('safari.app.showPrivacyReport', {}, __mactsOptions)
  }

  /**
   * Show Safari Credit Card Settings.
   */
  async showCreditCardSettings(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'safari.app.showCreditCardSettings',
      {},
      __mactsOptions
    )
  }
}
