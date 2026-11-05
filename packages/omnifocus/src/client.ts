/**
 * OmniFocus HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { TaskResourceClient } from './resources/task.js'
import { ProjectResourceClient } from './resources/project.js'
import { FolderResourceClient } from './resources/folder.js'
import { TagResourceClient } from './resources/tag.js'
import { InboxTaskResourceClient } from './resources/inboxtask.js'
import { PerspectiveResourceClient } from './resources/perspective.js'

import { omniFocusContract as appContract } from './contract/index.js'
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
import type { OmniFocusResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface OmniFocusClientOptions {
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
  bind<Client extends ClientBrand<OmniFocusResources>>(client: Client): void {
    const contract: AppContract<Client, OmniFocusResources> = {
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
      const legacy = new OmniFocusError(
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
 * Error class for OmniFocus API errors.
 */
export class OmniFocusError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'OmniFocusError'
    this.code = code
  }
}

/**
 * OmniFocus client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new OmniFocusClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface OmniFocusClient extends ClientBrand<OmniFocusResources> {}

export class OmniFocusClient {
  readonly #httpClient: HttpClient

  /** A task within OmniFocus */
  readonly tasks: TaskResourceClient

  /** A project in OmniFocus */
  readonly projects: ProjectResourceClient

  /** A group of projects and sub-folders representing an area of responsibility */
  readonly folders: FolderResourceClient

  /** A tag for organizing and filtering tasks */
  readonly tags: TagResourceClient

  /** A task that is in the document's inbox */
  readonly inboxTasks: InboxTaskResourceClient

  /** A saved view or filter configuration */
  readonly perspectives: PerspectiveResourceClient

  constructor(options: OmniFocusClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.tasks = new TaskResourceClient(this.#httpClient, 'omnifocus', 'tasks')
    this.projects = new ProjectResourceClient(this.#httpClient, 'omnifocus', 'projects')
    this.folders = new FolderResourceClient(this.#httpClient, 'omnifocus', 'folders')
    this.tags = new TagResourceClient(this.#httpClient, 'omnifocus', 'tags')
    this.inboxTasks = new InboxTaskResourceClient(this.#httpClient, 'omnifocus', 'inboxTasks')
    this.perspectives = new PerspectiveResourceClient(this.#httpClient, 'omnifocus', 'perspectives')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Generate a list of completions given a string
   */
  async complete(
    text: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnifocus.app.complete', { text }, __mactsOptions)
  }

  /**
   * Mark one or more projects or tasks complete
   */
  async markComplete(
    targets: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnifocus.app.markComplete',
      { targets },
      __mactsOptions
    )
  }

  /**
   * Mark one or more projects or tasks incomplete
   */
  async markIncomplete(
    targets: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnifocus.app.markIncomplete',
      { targets },
      __mactsOptions
    )
  }

  /**
   * Mark one or more projects or tasks as dropped
   */
  async markDropped(
    targets: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnifocus.app.markDropped',
      { targets },
      __mactsOptions
    )
  }

  /**
   * Converts a textual representation of tasks into tasks
   */
  async parseTasksInto(
    text: string,
    into: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnifocus.app.parseTasksInto',
      { text, into },
      __mactsOptions
    )
  }

  /**
   * Write a backup archive of the document
   */
  async archive(
    _in: string,
    compression?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'omnifocus.app.archive',
      { in: _in, compression },
      __mactsOptions
    )
  }

  /**
   * Hides completed tasks and processes any inbox items
   */
  async compact(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnifocus.app.compact', {}, __mactsOptions)
  }

  /**
   * Synchronizes with the shared OmniFocus sync database
   */
  async synchronize(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnifocus.app.synchronize', {}, __mactsOptions)
  }

  /**
   * Imports a file into an existing OmniFocus document
   */
  async importInto(
    file: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnifocus.app.importInto', { file }, __mactsOptions)
  }

  /**
   * Undo the last command
   */
  async undo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnifocus.app.undo', {}, __mactsOptions)
  }

  /**
   * Redo the last undone command
   */
  async redo(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('omnifocus.app.redo', {}, __mactsOptions)
  }
}
