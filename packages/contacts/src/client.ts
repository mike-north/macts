/**
 * Contacts HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { AddressResourceClient } from './resources/address.js'
import { EmailResourceClient } from './resources/email.js'
import { GroupResourceClient } from './resources/group.js'
import { PersonResourceClient } from './resources/person.js'
import { PhoneResourceClient } from './resources/phone.js'

import { contactsContract as appContract } from './contract/index.js'
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
import type { ContactsResources } from './contract/index.js'

/**
 * Client configuration options.
 */
export interface ContactsClientOptions {
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
  bind<Client extends ClientBrand<ContactsResources>>(client: Client): void {
    const contract: AppContract<Client, ContactsResources> = {
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
      const legacy = new ContactsError(
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
 * Error class for Contacts API errors.
 */
export class ContactsError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ContactsError'
    this.code = code
  }
}

/**
 * Contacts client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new ContactsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
/** Shared type-only resource brand lets caller-built references target this facade. */
export interface ContactsClient extends ClientBrand<ContactsResources> {}

export class ContactsClient {
  readonly #httpClient: HttpClient

  /** Address for the given record. */
  readonly addresses: AddressResourceClient

  /** Email address for a person. */
  readonly emails: EmailResourceClient

  /** A Group Record in the address book database */
  readonly groups: GroupResourceClient

  /** A person in the address book database. */
  readonly people: PersonResourceClient

  /** Phone number for a person. */
  readonly phones: PhoneResourceClient

  constructor(options: ContactsClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.addresses = new AddressResourceClient(this.#httpClient, 'contacts', 'addresses')
    this.emails = new EmailResourceClient(this.#httpClient, 'contacts', 'emails')
    this.groups = new GroupResourceClient(this.#httpClient, 'contacts', 'groups')
    this.people = new PersonResourceClient(this.#httpClient, 'contacts', 'people')
    this.phones = new PhoneResourceClient(this.#httpClient, 'contacts', 'phones')
    this.#httpClient.bind(this)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Create a new object.
   */
  async make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'contacts.app.make',
      { new: _new, at, withData, withProperties },
      __mactsOptions
    )
  }

  /**
   * Add a child object.
   */
  async add(to: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('contacts.app.add', { to }, __mactsOptions)
  }

  /**
   * Remove a child object.
   */
  async remove(
    from: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>('contacts.app.remove', { from }, __mactsOptions)
  }

  /**
   * Save all Contacts changes. Also see the unsaved property for the application class.
   */
  async save(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('contacts.app.save', {}, __mactsOptions)
  }

  /**
   * RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)
   */
  async actionProperty(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#httpClient.invoke<undefined>('contacts.app.actionProperty', {}, __mactsOptions)
  }

  /**
   * RollOver - Returns the title that will be placed in the menu for this roll over
   */
  async actionTitle(
    _with: unknown,
    _for: Parameters<import('./contract/index.js').ContactsClient['actionTitle']>[1],
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'contacts.app.actionTitle',
      { with: _with, for: _for },
      __mactsOptions
    )
  }

  /**
   * RollOver - Performs the action on the given person and value
   */
  async performAction(
    _with: unknown,
    _for: Parameters<import('./contract/index.js').ContactsClient['performAction']>[1],
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'contacts.app.performAction',
      { with: _with, for: _for },
      __mactsOptions
    )
  }

  /**
   * RollOver - Determines if the rollover action should be enabled for the given person and value
   */
  async shouldEnableAction(
    _with: unknown,
    _for: Parameters<import('./contract/index.js').ContactsClient['shouldEnableAction']>[1],
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#httpClient.invoke<undefined>(
      'contacts.app.shouldEnableAction',
      { with: _with, for: _for },
      __mactsOptions
    )
  }
}
