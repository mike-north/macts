/**
 * Reminders HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { AccountResourceClient } from './resources/account.js';
import { ListResourceClient } from './resources/list.js';
import { ReminderResourceClient } from './resources/reminder.js';


/**
 * Client configuration options.
 */
export interface RemindersClientOptions {
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
      throw new RemindersError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Reminders API errors.
 */
export class RemindersError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RemindersError';
    this.code = code;
  }
}

/**
 * Reminders client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new RemindersClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class RemindersClient {
  readonly #httpClient: HttpClient;

  /** An account in the Reminders application */
  readonly accounts: AccountResourceClient;

  /** A list of reminders */
  readonly lists: ListResourceClient;

  /** A reminder item */
  readonly reminders: ReminderResourceClient;

  constructor(options: RemindersClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.accounts = new AccountResourceClient(this.#httpClient, 'reminders', 'accounts');
    this.lists = new ListResourceClient(this.#httpClient, 'reminders', 'lists');
    this.reminders = new ReminderResourceClient(this.#httpClient, 'reminders', 'reminders');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

}
