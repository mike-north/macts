/**
 * Finder HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { finderContract as appContract } from './contract/index.js'
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
import type { FinderResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface FinderClientOptions {
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
    const contract: AppContract<object, FinderResources> = {
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
    const legacy = new FinderError(
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
 * Error class for Finder API errors.
 */
export class FinderError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FinderError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface FinderClient extends ClientBrand<FinderResources> {}

/**
 * Finder client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new FinderClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class FinderClient {
  readonly #httpClient: HttpClient

  constructor(options: FinderClientOptions) {
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
   * Open the specified object(s)
   */
  async open(
    using?: string,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'finder.app.open',
      { using, withProperties },
      __mactsOptions
    )
  }

  /**
   * Print the specified object(s)
   */
  async print(
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.print', { withProperties }, __mactsOptions)
  }

  /**
   * Quit the Finder
   */
  async quit(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.quit', {}, __mactsOptions)
  }

  /**
   * Activate the specified window (or the Finder)
   */
  async activate(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.activate', {}, __mactsOptions)
  }

  /**
   * Close an object
   */
  async close(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.close', {}, __mactsOptions)
  }

  /**
   * Return the number of elements of a particular class within an object
   */
  async count(
    each: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.count', { each }, __mactsOptions)
  }

  /**
   * Return the size in bytes of an object
   */
  async dataSize(
    as?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.dataSize', { as }, __mactsOptions)
  }

  /**
   * Duplicate one or more object(s)
   */
  async duplicate(
    to?: string,
    replacing?: boolean,
    routingSuppressed?: boolean,
    exactCopy?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'finder.app.duplicate',
      { to, replacing, routingSuppressed, exactCopy },
      __mactsOptions
    )
  }

  /**
   * Verify if an object exists
   */
  async exists(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.exists', {}, __mactsOptions)
  }

  /**
   * Make a new element
   */
  async make(
    _new: string,
    at: string,
    to?: string,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'finder.app.make',
      { new: _new, at, to, withProperties },
      __mactsOptions
    )
  }

  /**
   * Move object(s) to a new location
   */
  async move(
    to: string,
    replacing?: boolean,
    positionedAt?: string,
    routingSuppressed?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'finder.app.move',
      { to, replacing, positionedAt, routingSuppressed },
      __mactsOptions
    )
  }

  /**
   * Select the specified object(s)
   */
  async select(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.select', {}, __mactsOptions)
  }

  /**
   * Private event to open a virtual location
   */
  async openVirtualLocation(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.openVirtualLocation', {}, __mactsOptions)
  }

  /**
   * (NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)
   */
  async copy(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.copy', {}, __mactsOptions)
  }

  /**
   * Return the specified object(s) in a sorted list
   */
  async sort(by: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.sort', { by }, __mactsOptions)
  }

  /**
   * Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)
   */
  async cleanUp(
    by?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.cleanUp', { by }, __mactsOptions)
  }

  /**
   * Eject the specified disk(s)
   */
  async eject(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.eject', {}, __mactsOptions)
  }

  /**
   * Empty the trash
   */
  async empty(
    security?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.empty', { security }, __mactsOptions)
  }

  /**
   * (NOT AVAILABLE) Erase the specified disk(s)
   */
  async erase(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.erase', {}, __mactsOptions)
  }

  /**
   * Bring the specified object(s) into view
   */
  async reveal(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.reveal', {}, __mactsOptions)
  }

  /**
   * Update the display of the specified object(s) to match their on-disk representation
   */
  async update(
    necessity?: boolean,
    registeringApplications?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'finder.app.update',
      { necessity, registeringApplications },
      __mactsOptions
    )
  }

  /**
   * Restart the computer
   */
  async restart(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.restart', {}, __mactsOptions)
  }

  /**
   * Shut Down the computer
   */
  async shutDown(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.shutDown', {}, __mactsOptions)
  }

  /**
   * Put the computer to sleep
   */
  async sleep(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('finder.app.sleep', {}, __mactsOptions)
  }
}
