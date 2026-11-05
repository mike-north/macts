/**
 * iTerm HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { iTermContract as appContract } from './contract/index.js'
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
import type { iTermResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface iTermClientOptions {
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
    const contract: AppContract<object, iTermResources> = {
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
    const legacy = new iTermError(
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
 * Error class for iTerm API errors.
 */
export class iTermError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'iTermError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface iTermClient extends ClientBrand<iTermResources> {}

/**
 * iTerm client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new iTermClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class iTermClient {
  readonly #httpClient: HttpClient

  constructor(options: iTermClientOptions) {
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
   * Return the number of elements of a particular class within an object.
   */
  async count(
    each?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.count', { each }, __mactsOptions)
  }

  /**
   * Copy object(s) and put the copies at a new location.
   */
  async duplicate(
    to: string,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.duplicate',
      { to, withProperties },
      __mactsOptions
    )
  }

  /**
   * Verify if an object exists.
   */
  async exists(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.exists', {}, __mactsOptions)
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
      'iterm.app.make',
      { new: _new, at, withData, withProperties },
      __mactsOptions
    )
  }

  /**
   * Move object(s) to a new location.
   */
  async move(to: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.move', { to }, __mactsOptions)
  }

  /**
   * Close a document.
   */
  async close(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.close', {}, __mactsOptions)
  }

  /**
   * Request a Python API cookie
   */
  async requestCookie(
    andKeyForAppNamed?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.requestCookie',
      { andKeyForAppNamed },
      __mactsOptions
    )
  }

  /**
   * Create a new tab
   */
  async createTab(
    withProfile: string,
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.createTab',
      { withProfile, command },
      __mactsOptions
    )
  }

  /**
   * Create a new tab with the default profile
   */
  async createTabWithDefaultProfile(
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.createTabWithDefaultProfile',
      { command },
      __mactsOptions
    )
  }

  /**
   * Create a new window
   */
  async createWindowWithProfile(
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.createWindowWithProfile',
      { command },
      __mactsOptions
    )
  }

  /**
   * Create a hotkey window
   */
  async createHotkeyWindowWithProfile(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.createHotkeyWindowWithProfile',
      {},
      __mactsOptions
    )
  }

  /**
   * Launch API script by name
   */
  async launchAPIScriptNamed(
    _arguments?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.launchAPIScriptNamed',
      { arguments: _arguments },
      __mactsOptions
    )
  }

  /**
   * Invokes an expression, such as a registered function.
   */
  async invokeAPIExpression(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.invokeAPIExpression', {}, __mactsOptions)
  }

  /**
   * Create a new window with the default profile
   */
  async createWindowWithDefaultProfile(
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.createWindowWithDefaultProfile',
      { command },
      __mactsOptions
    )
  }

  /**
   * Send text as though it was typed.
   */
  async write(
    contentsOfFile?: Parameters<import('./contract/index.js').iTermClient['write']>[0],
    text?: string,
    newline?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.write',
      { contentsOfFile, text, newline },
      __mactsOptions
    )
  }

  /**
   * Make receiver visible and selected.
   */
  async select(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.select', {}, __mactsOptions)
  }

  /**
   * Split a session vertically.
   */
  async splitVertically(
    withProfile: string,
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.splitVertically',
      { withProfile, command },
      __mactsOptions
    )
  }

  /**
   * Split a session vertically, using the default profile for the new session
   */
  async splitVerticallyWithDefaultProfile(
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.splitVerticallyWithDefaultProfile',
      { command },
      __mactsOptions
    )
  }

  /**
   * Split a session vertically, using the original session's profile for the new session
   */
  async splitVerticallyWithSameProfile(
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.splitVerticallyWithSameProfile',
      { command },
      __mactsOptions
    )
  }

  /**
   * Split a session horizontally.
   */
  async splitHorizontally(
    withProfile: string,
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.splitHorizontally',
      { withProfile, command },
      __mactsOptions
    )
  }

  /**
   * Split a session horizontally, using the default profile for the new session
   */
  async splitHorizontallyWithDefaultProfile(
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.splitHorizontallyWithDefaultProfile',
      { command },
      __mactsOptions
    )
  }

  /**
   * Split a session horizontally, using the original session's profile for the new session
   */
  async splitHorizontallyWithSameProfile(
    command?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'iterm.app.splitHorizontallyWithSameProfile',
      { command },
      __mactsOptions
    )
  }

  /**
   * Returns the value of a session variable with the given name
   */
  async variable(
    named: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.variable', { named }, __mactsOptions)
  }

  /**
   * Sets the value of a session variable
   */
  async setVariable(
    named: string,
    to: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.setVariable', { named, to }, __mactsOptions)
  }

  /**
   * Reveals a hotkey window. Only to be called on windows that are hotkey windows.
   */
  async revealHotkeyWindow(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.revealHotkeyWindow', {}, __mactsOptions)
  }

  /**
   * Hides a hotkey window. Only to be called on windows that are hotkey windows.
   */
  async hideHotkeyWindow(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.hideHotkeyWindow', {}, __mactsOptions)
  }

  /**
   * Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey windows.
   */
  async toggleHotkeyWindow(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('iterm.app.toggleHotkeyWindow', {}, __mactsOptions)
  }
}
