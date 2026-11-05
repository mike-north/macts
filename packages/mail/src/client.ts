/**
 * Mail HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { OutgoingMessageResourceClient } from './resources/outgoingmessage.js'
import { MessageResourceClient } from './resources/message.js'

import { mailContract as appContract } from './contract/index.js'
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
import type { MailResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface MailClientOptions {
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
  bind<Client extends ClientBrand<MailResources>>(client: Client): void {
    const contract: AppContract<Client, MailResources> = {
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
      const legacy = new MailError(
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
 * Error class for Mail API errors.
 */
export class MailError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MailError'
    this.code = code
  }
}

/**
 * Mail client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new MailClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface MailClient extends ClientBrand<MailResources> {}

export class MailClient {
  readonly #httpClient: HttpClient

  /** A new email message */
  readonly outgoingMessages: OutgoingMessageResourceClient

  /** An email message */
  readonly messages: MessageResourceClient

  constructor(options: MailClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.outgoingMessages = new OutgoingMessageResourceClient(
      this.#httpClient,
      'mail',
      'outgoingMessages'
    )
    this.messages = new MessageResourceClient(this.#httpClient, 'mail', 'messages')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Copy an object.
   */
  async duplicate(
    to?: string,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'mail.app.duplicate',
      { to, withProperties },
      __mactsOptions
    )
  }

  /**
   * Move an object to a new location.
   */
  async move(to: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('mail.app.move', { to }, __mactsOptions)
  }

  /**
   * Triggers a check for email.
   */
  async checkForNewMail(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('mail.app.checkForNewMail', {}, __mactsOptions)
  }

  /**
   * Command to get the full name out of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "John Doe"
   */
  async extractNameFrom(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('mail.app.extractNameFrom', {}, __mactsOptions)
  }

  /**
   * Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"
   */
  async extractAddressFrom(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('mail.app.extractAddressFrom', {}, __mactsOptions)
  }

  /**
   * Opens a mailto URL.
   */
  async getURL(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('mail.app.getURL', {}, __mactsOptions)
  }

  /**
   * Imports a mailbox created by Mail.
   */
  async importMailMailbox(
    at: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('mail.app.importMailMailbox', { at }, __mactsOptions)
  }

  /**
   * Opens a mailto URL.
   */
  async mailto(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('mail.app.mailto', {}, __mactsOptions)
  }

  /**
   * Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.
   */
  async performMailActionWithMessages(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'mail.app.performMailActionWithMessages',
      {},
      __mactsOptions
    )
  }
}
