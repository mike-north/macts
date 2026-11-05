/**
 * SystemEvents HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ClassicDomainObjectResourceClient } from './resources/classicdomainobject.js'
import { DiskItemResourceClient } from './resources/diskitem.js'
import { DomainResourceClient } from './resources/domain.js'
import { FolderResourceClient } from './resources/folder.js'
import { UserDomainObjectResourceClient } from './resources/userdomainobject.js'
import { ActionResourceClient } from './resources/action.js'
import { UIElementResourceClient } from './resources/uielement.js'
import { systemEventsContract as appContract } from './contract/index.js'
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
import type { SystemEventsResources } from './contract/index.js'

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
export interface SystemEventsClientOptions {
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
    const contract: AppContract<object, SystemEventsResources> = {
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
    const legacy = new SystemEventsError(
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
 * Error class for SystemEvents API errors.
 */
export class SystemEventsError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SystemEventsError'
    this.code = code
  }
}

/**
 * The shared type-only resource brand lets caller-built references target this facade.
 * It adds no runtime fields; construction registers the actual instance.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging -- Only the non-runtime brand is merged into the retained class constructor.
export interface SystemEventsClient extends ClientBrand<SystemEventsResources> {}

/**
 * SystemEvents client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SystemEventsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- The merged interface contributes only the shared phantom brand, never runtime members.
export class SystemEventsClient {
  readonly #httpClient: HttpClient

  /** The Classic domain in the file system */
  readonly classicDomainObjects: ClassicDomainObjectResourceClient

  /** An item stored in the file system */
  readonly diskItems: DiskItemResourceClient

  /** A domain in the file system */
  readonly domains: DomainResourceClient

  /** A folder in the file system */
  readonly folders: FolderResourceClient

  /** The user domain in the file system */
  readonly userDomainObjects: UserDomainObjectResourceClient

  /** An action that can be performed on the UI element */
  readonly actions: ActionResourceClient

  /** A piece of the user interface of a process */
  readonly uiElements: UIElementResourceClient

  constructor(options: SystemEventsClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.classicDomainObjects = new ClassicDomainObjectResourceClient(
      this.#httpClient,
      'system-events',
      'classicDomainObjects'
    )
    this.diskItems = new DiskItemResourceClient(this.#httpClient, 'system-events', 'diskItems')
    this.domains = new DomainResourceClient(this.#httpClient, 'system-events', 'domains')
    this.folders = new FolderResourceClient(this.#httpClient, 'system-events', 'folders')
    this.userDomainObjects = new UserDomainObjectResourceClient(
      this.#httpClient,
      'system-events',
      'userDomainObjects'
    )
    this.actions = new ActionResourceClient(this.#httpClient, 'system-events', 'actions')
    this.uiElements = new UIElementResourceClient(this.#httpClient, 'system-events', 'uiElements')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Discard the results of a bounded update session with one or more files.
   */
  async abortTransaction(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.abortTransaction',
      {},
      __mactsOptions
    )
  }

  /**
   * Begin a bounded update session with one or more files.
   */
  async beginTransaction(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.beginTransaction',
      {},
      __mactsOptions
    )
  }

  /**
   * Apply the results of a bounded update session with one or more files.
   */
  async endTransaction(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.endTransaction', {}, __mactsOptions)
  }

  /**
   * connect a configuration or service
   */
  async connect(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.connect', {}, __mactsOptions)
  }

  /**
   * disconnect a configuration or service
   */
  async disconnect(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.disconnect', {}, __mactsOptions)
  }

  /**
   * start the screen saver
   */
  async start(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.start', {}, __mactsOptions)
  }

  /**
   * stop the screen saver
   */
  async stop(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.stop', {}, __mactsOptions)
  }

  /**
   * Move disk item(s) to a new location.
   */
  async move(to: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.move', { to }, __mactsOptions)
  }

  /**
   * Open disk item(s) with the appropriate application.
   */
  async open(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.open', {}, __mactsOptions)
  }

  /**
   * Log out the current user
   */
  async logOut(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.logOut', {}, __mactsOptions)
  }

  /**
   * Restart the computer
   */
  async restart(
    stateSavingPreference?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.restart',
      { stateSavingPreference },
      __mactsOptions
    )
  }

  /**
   * Shut Down the computer
   */
  async shutDown(
    stateSavingPreference?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.shutDown',
      { stateSavingPreference },
      __mactsOptions
    )
  }

  /**
   * Put the computer to sleep
   */
  async sleep(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.sleep', {}, __mactsOptions)
  }

  /**
   * cause the target process to behave as if key codes were entered
   */
  async keyCode(
    using?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.keyCode', { using }, __mactsOptions)
  }

  /**
   * cause the target process to behave as if keystrokes were entered
   */
  async keystroke(
    using?: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.keystroke',
      { using },
      __mactsOptions
    )
  }

  /**
   * Attach an action to a folder
   */
  async attachActionTo(
    using: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.attachActionTo',
      { using },
      __mactsOptions
    )
  }

  /**
   * List the actions attached to a folder
   */
  async attachedScripts(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.attachedScripts',
      {},
      __mactsOptions
    )
  }

  /**
   * cause the target process to behave as if the UI element were cancelled
   */
  async cancel(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.cancel', {}, __mactsOptions)
  }

  /**
   * cause the target process to behave as if the UI element were confirmed
   */
  async confirm(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.confirm', {}, __mactsOptions)
  }

  /**
   * cause the target process to behave as if the UI element were decremented
   */
  async decrement(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.decrement', {}, __mactsOptions)
  }

  /**
   * Send a folder action code to a folder action script
   */
  async doFolderAction(
    folderActionCode: string,
    withItemList?: unknown,
    withWindowSize?: Parameters<
      import('./contract/index.js').SystemEventsClient['doFolderAction']
    >[2],
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.doFolderAction',
      { folderActionCode, withItemList, withWindowSize },
      __mactsOptions
    )
  }

  /**
   * Edit an action of a folder
   */
  async editActionOf(
    usingActionName?: string,
    usingActionNumber?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.editActionOf',
      {
        usingActionName,
        ...(usingActionNumber === undefined
          ? {}
          : { usingActionNumber: __mactsIntegerInput(usingActionNumber) }),
      },
      __mactsOptions
    )
  }

  /**
   * cause the target process to behave as if the UI element were incremented
   */
  async increment(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.increment', {}, __mactsOptions)
  }

  /**
   * cause the target process to behave as if keys were held down
   */
  async keyDown(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.keyDown', {}, __mactsOptions)
  }

  /**
   * cause the target process to behave as if keys were released
   */
  async keyUp(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.keyUp', {}, __mactsOptions)
  }

  /**
   * cause the target process to behave as if the UI element were picked
   */
  async pick(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('system-events.app.pick', {}, __mactsOptions)
  }

  /**
   * Remove a folder action from a folder
   */
  async removeActionFrom(
    usingActionName?: string,
    usingActionNumber?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'system-events.app.removeActionFrom',
      {
        usingActionName,
        ...(usingActionNumber === undefined
          ? {}
          : { usingActionNumber: __mactsIntegerInput(usingActionNumber) }),
      },
      __mactsOptions
    )
  }
}
