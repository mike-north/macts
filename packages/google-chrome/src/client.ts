/**
 * GoogleChrome HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WindowResourceClient } from './resources/window.js'
import { TabResourceClient } from './resources/tab.js'

import { googleChromeContract as appContract } from './contract/index.js'
import {
  createCodecClient,
  createRemoteTransport,
  type ClientTransport,
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
import type { GoogleChromeResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface GoogleChromeClientOptions {
  /** API key for authentication */
  apiKey: string
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
/** Canonical failures retained privately while raw RPC preserves the legacy error class. */
const canonicalFailures = new WeakMap<Error, MactsError>()

/**
 * Private request metadata selects the canonical POST while retaining the public
 * raw RPC hook. It never enters the request body or caller-owned options.
 */
const canonicalCall = Symbol('canonical contract call')

export class HttpClient {
  readonly #transport: ClientTransport
  readonly #baseUrl: string
  readonly #apiKey: string
  #runtime: ClientRuntime | undefined

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
    this.#transport = createRemoteTransport(appContract, { url: baseUrl, token: apiKey })
  }

  /**
   * Bind the actual public facade in the shared reference registry. A copied
   * contract changes only construction; its descriptors and codecs are shared.
   * @internal
   */
  bind<Client extends ClientBrand<GoogleChromeResources>>(client: Client): void {
    const contract: AppContract<Client, GoogleChromeResources> = {
      ...appContract,
      bind: (runtime) => {
        this.#runtime = runtime
        return client
      },
    }
    createCodecClient(contract, {
      invoke: async (operation, input, options) => {
        try {
          const requestOptions: CallOptions & { readonly [canonicalCall]: true } = {
            ...options,
            [canonicalCall]: true,
          }
          return await this.rpc(operation, input as object, requestOptions)
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

  /** Invoke a registered operation with SDK input; raw RPC hooks still see wire input. @internal */
  async invoke<T>(path: string, input: object = {}, options?: CallOptions): Promise<T> {
    const operation = Object.values(appContract.operations).find(
      (candidate) => candidate.id === path
    )
    if (operation === undefined || operation.unavailable !== undefined) {
      throw new ValidationError('The operation is not registered in this app contract.', {
        issues: [{ path: [], message: 'Unknown operation route.' }],
      })
    }
    if (this.#runtime === undefined) this.bind({})
    if (this.#runtime === undefined) throw new Error('Client runtime was not initialized.')
    return this.#runtime.invoke(operation, input, options) as Promise<T>
  }

  /** Raw wire RPC for explicit passthrough consumers; typed methods use invoke. */
  async rpc<T>(path: string, body: object = {}, options?: CallOptions): Promise<T> {
    // Typed wrappers still dispatch through overrides; an override forwarding to
    // super retains the shared transport's envelope/cancellation semantics.
    if (options !== undefined && canonicalCall in options) {
      return (await this.#transport.invoke(path as OperationId, body as WireValue, options)) as T
    }
    const response = await fetch(`${this.#baseUrl}/api/v1/rpc/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    })
    if (!response.ok) {
      const envelope: unknown = await response.json()
      const error = envelope as { error?: { code?: string; message?: string } }
      const legacy = new GoogleChromeError(
        error.error?.code ?? 'UNKNOWN_ERROR',
        error.error?.message ?? `HTTP ${String(response.status)}`
      )
      canonicalFailures.set(legacy, fromWireErrorEnvelope(envelope, { status: response.status }))
      throw legacy
    }
    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for GoogleChrome API errors.
 */
export class GoogleChromeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GoogleChromeError'
    this.code = code
  }
}

/**
 * GoogleChrome client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new GoogleChromeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface GoogleChromeClient extends ClientBrand<GoogleChromeResources> {}

export class GoogleChromeClient {
  readonly #httpClient: HttpClient

  /** A window. */
  readonly windows: WindowResourceClient

  /** A tab. */
  readonly tabs: TabResourceClient

  constructor(options: GoogleChromeClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.windows = new WindowResourceClient(this.#httpClient, 'google-chrome', 'windows')
    this.tabs = new TabResourceClient(this.#httpClient, 'google-chrome', 'tabs')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Save an object.
   */
  async save(
    _in?: string,
    as?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'google-chrome.app.save',
      { in: _in, as },
      __mactsOptions
    )
  }

  /**
   * Open a document.
   */
  async open(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.open', {}, __mactsOptions)
  }

  /**
   * Close a window.
   */
  async close(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.close', {}, __mactsOptions)
  }

  /**
   * Quit the application.
   */
  async quit(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.quit', {}, __mactsOptions)
  }

  /**
   * Return the number of elements of a particular class within an object.
   */
  async count(
    each?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.count', { each }, __mactsOptions)
  }

  /**
   * Copy object(s) and put the copies at a new location.
   */
  async duplicate(
    to?: string,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'google-chrome.app.duplicate',
      { to, withProperties },
      __mactsOptions
    )
  }

  /**
   * Verify if an object exists.
   */
  async exists(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.exists', {}, __mactsOptions)
  }

  /**
   * Make a new object.
   */
  async make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'google-chrome.app.make',
      { new: _new, at, withData, withProperties },
      __mactsOptions
    )
  }

  /**
   * Move object(s) to a new location.
   */
  async move(to: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.move', { to }, __mactsOptions)
  }

  /**
   * Print an object.
   */
  async print(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.print', {}, __mactsOptions)
  }

  /**
   * Reload a tab.
   */
  async reload(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.reload', {}, __mactsOptions)
  }

  /**
   * Go Back (If Possible).
   */
  async goBack(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.goBack', {}, __mactsOptions)
  }

  /**
   * Go Forward (If Possible).
   */
  async goForward(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.goForward', {}, __mactsOptions)
  }

  /**
   * Select all.
   */
  async selectAll(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.selectAll', {}, __mactsOptions)
  }

  /**
   * Cut selected text (If Possible).
   */
  async cutSelection(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.cutSelection', {}, __mactsOptions)
  }

  /**
   * Copy text.
   */
  async copySelection(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.copySelection', {}, __mactsOptions)
  }

  /**
   * Paste text (If Possible).
   */
  async pasteSelection(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.pasteSelection', {}, __mactsOptions)
  }

  /**
   * Undo the last change.
   */
  async undo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.undo', {}, __mactsOptions)
  }

  /**
   * Redo the last change.
   */
  async redo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.redo', {}, __mactsOptions)
  }

  /**
   * Stop the current tab from loading.
   */
  async stop(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.stop', {}, __mactsOptions)
  }

  /**
   * View the HTML source of the tab.
   */
  async viewSource(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('google-chrome.app.viewSource', {}, __mactsOptions)
  }

  /**
   * Execute a piece of javascript.
   */
  async execute(
    javascript: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'google-chrome.app.execute',
      { javascript },
      __mactsOptions
    )
  }
}
