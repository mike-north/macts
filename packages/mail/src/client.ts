/**
 * Mail HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { OutgoingMessageResourceClient } from './resources/outgoingmessage.js'
import { MessageResourceClient } from './resources/message.js'
import type { Account, Mailbox, Rule } from './types.js'

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
      throw new MailError(code, message)
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
export class MailClient {
  readonly #httpClient: HttpClient

  /** A new email message */
  readonly outgoingmessages: OutgoingMessageResourceClient

  /** An email message */
  readonly messages: MessageResourceClient

  constructor(options: MailClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.outgoingmessages = new OutgoingMessageResourceClient(
      this.#httpClient,
      'mail',
      'outgoingmessages'
    )
    this.messages = new MessageResourceClient(this.#httpClient, 'mail', 'messages')
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Delete an object.
   */
  async _delete(): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.delete', {})
  }

  /**
   * Copy an object.
   */
  async duplicate(to?: string, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.duplicate', { to, withProperties })
  }

  /**
   * Move an object to a new location.
   */
  async move(to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.move', { to })
  }

  /**
   * Triggers a check for email.
   */
  async checkForNewMail(_for?: Account): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.checkForNewMail', { for: _for })
  }

  /**
   * Command to get the full name out of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "John Doe"
   */
  async extractNameFrom(): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.extractNameFrom', {})
  }

  /**
   * Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"
   */
  async extractAddressFrom(): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.extractAddressFrom', {})
  }

  /**
   * Opens a mailto URL.
   */
  async getURL(): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.getURL', {})
  }

  /**
   * Imports a mailbox created by Mail.
   */
  async importMailMailbox(at: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.importMailMailbox', { at })
  }

  /**
   * Opens a mailto URL.
   */
  async mailto(): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.mailto', {})
  }

  /**
   * Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.
   */
  async performMailActionWithMessages(inMailboxes?: Mailbox, forRule?: Rule): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.performMailActionWithMessages', {
      inMailboxes,
      forRule,
    })
  }

  /**
   * Command to trigger synchronizing of an IMAP account with the server.
   */
  async synchronize(_with: Account): Promise<void> {
    await this.#httpClient.rpc<undefined>('mail.app.synchronize', { with: _with })
  }
}
