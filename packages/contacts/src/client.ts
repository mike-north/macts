/**
 * Contacts HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { AddressResourceClient } from './resources/address.js'
import { AIMHandleResourceClient } from './resources/aimhandle.js'
import { CustomDateResourceClient } from './resources/customdate.js'
import { EmailResourceClient } from './resources/email.js'
import { GroupResourceClient } from './resources/group.js'
import { ICQHandleResourceClient } from './resources/icqhandle.js'
import { InstantMessageResourceClient } from './resources/instantmessage.js'
import { JabberHandleResourceClient } from './resources/jabberhandle.js'
import { MSNHandleResourceClient } from './resources/msnhandle.js'
import { PersonResourceClient } from './resources/person.js'
import { PhoneResourceClient } from './resources/phone.js'
import { RelatedNameResourceClient } from './resources/relatedname.js'
import { SocialProfileResourceClient } from './resources/socialprofile.js'
import { UrlResourceClient } from './resources/url.js'
import { YahooHandleResourceClient } from './resources/yahoohandle.js'

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
export class HttpClient {
  readonly #baseUrl: string
  readonly #apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl
    this.#apiKey = apiKey
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = (await response.json()) as { error?: { code?: string; message?: string } }
      const code = error.error?.code ?? 'UNKNOWN_ERROR'
      const message = error.error?.message ?? `HTTP ${String(response.status)}`
      throw new ContactsError(code, message)
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
export class ContactsClient {
  readonly #httpClient: HttpClient

  /** Address for the given record. */
  readonly addresses: AddressResourceClient

  /** User name for America Online (AOL) instant messaging. */
  readonly aimhandles: AIMHandleResourceClient

  /** Arbitrary date associated with this person. */
  readonly customdates: CustomDateResourceClient

  /** Email address for a person. */
  readonly emails: EmailResourceClient

  /** A Group Record in the address book database */
  readonly groups: GroupResourceClient

  /** User name for ICQ instant messaging. */
  readonly icqhandles: ICQHandleResourceClient

  /** Address for instant messaging. */
  readonly instantmessages: InstantMessageResourceClient

  /** User name for Jabber instant messaging. */
  readonly jabberhandles: JabberHandleResourceClient

  /** User name for Microsoft Network (MSN) instant messaging. */
  readonly msnhandles: MSNHandleResourceClient

  /** A person in the address book database. */
  readonly people: PersonResourceClient

  /** Phone number for a person. */
  readonly phones: PhoneResourceClient

  /** Other names related to this person. */
  readonly relatednames: RelatedNameResourceClient

  /** Profile for social networks. */
  readonly socialprofiles: SocialProfileResourceClient

  /** URLs for this person. */
  readonly urls: UrlResourceClient

  /** User name for Yahoo instant messaging. */
  readonly yahoohandles: YahooHandleResourceClient

  constructor(options: ContactsClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.addresses = new AddressResourceClient(this.#httpClient, 'contacts', 'addresses')
    this.aimhandles = new AIMHandleResourceClient(this.#httpClient, 'contacts', 'aimhandles')
    this.customdates = new CustomDateResourceClient(this.#httpClient, 'contacts', 'customdates')
    this.emails = new EmailResourceClient(this.#httpClient, 'contacts', 'emails')
    this.groups = new GroupResourceClient(this.#httpClient, 'contacts', 'groups')
    this.icqhandles = new ICQHandleResourceClient(this.#httpClient, 'contacts', 'icqhandles')
    this.instantmessages = new InstantMessageResourceClient(
      this.#httpClient,
      'contacts',
      'instantmessages'
    )
    this.jabberhandles = new JabberHandleResourceClient(
      this.#httpClient,
      'contacts',
      'jabberhandles'
    )
    this.msnhandles = new MSNHandleResourceClient(this.#httpClient, 'contacts', 'msnhandles')
    this.people = new PersonResourceClient(this.#httpClient, 'contacts', 'people')
    this.phones = new PhoneResourceClient(this.#httpClient, 'contacts', 'phones')
    this.relatednames = new RelatedNameResourceClient(this.#httpClient, 'contacts', 'relatednames')
    this.socialprofiles = new SocialProfileResourceClient(
      this.#httpClient,
      'contacts',
      'socialprofiles'
    )
    this.urls = new UrlResourceClient(this.#httpClient, 'contacts', 'urls')
    this.yahoohandles = new YahooHandleResourceClient(this.#httpClient, 'contacts', 'yahoohandles')
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
    withProperties?: unknown
  ): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.make', {
      new: _new,
      at,
      withData,
      withProperties,
    })
  }

  /**
   * Add a child object.
   */
  async add(to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.add', { to })
  }

  /**
   * Remove a child object.
   */
  async remove(from: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.remove', { from })
  }

  /**
   * Save all Contacts changes. Also see the unsaved property for the application class.
   */
  async save(): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.save', {})
  }

  /**
   * RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)
   */
  async actionProperty(): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.actionProperty', {})
  }

  /**
   * RollOver - Returns the title that will be placed in the menu for this roll over
   */
  async actionTitle(_with: unknown, _for: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.actionTitle', { with: _with, for: _for })
  }

  /**
   * RollOver - Performs the action on the given person and value
   */
  async performAction(_with: unknown, _for: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.performAction', { with: _with, for: _for })
  }

  /**
   * RollOver - Determines if the rollover action should be enabled for the given person and value
   */
  async shouldEnableAction(_with: unknown, _for: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('contacts.app.shouldEnableAction', {
      with: _with,
      for: _for,
    })
  }
}
