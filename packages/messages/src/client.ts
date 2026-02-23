/**
 * Messages HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ParticipantResourceClient } from './resources/participant.js';
import { AccountResourceClient } from './resources/account.js';
import { ChatResourceClient } from './resources/chat.js';


/**
 * Client configuration options.
 */
export interface MessagesClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string;
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { code?: string; message?: string } };
      const code = error?.error?.code ?? 'UNKNOWN_ERROR';
      const message = error?.error?.message ?? `HTTP ${response.status}`;
      throw new MessagesError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Messages API errors.
 */
export class MessagesError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'MessagesError';
    this.code = code;
  }
}

/**
 * Messages client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new MessagesClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class MessagesClient {
  readonly #httpClient: HttpClient;

  /** A participant for an account. */
  readonly participants: ParticipantResourceClient;

  /** An account that can be logged in to from this system */
  readonly accounts: AccountResourceClient;

  /** An SMS or iMessage chat. */
  readonly chats: ChatResourceClient;

  constructor(options: MessagesClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.participants = new ParticipantResourceClient(this.#httpClient, 'messages', 'participants');
    this.accounts = new AccountResourceClient(this.#httpClient, 'messages', 'accounts');
    this.chats = new ChatResourceClient(this.#httpClient, 'messages', 'chats');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Sends a message to a participant or to a chat.
   */
  async send(to: string): Promise<void> {
    return this.#httpClient.rpc<void>('messages.app.send', { to });
  }


  /**
   * Login to all accounts.
   */
  async login(): Promise<void> {
    return this.#httpClient.rpc<void>('messages.app.login', {});
  }


  /**
   * Logout of all accounts.
   */
  async logout(): Promise<void> {
    return this.#httpClient.rpc<void>('messages.app.logout', {});
  }
}
