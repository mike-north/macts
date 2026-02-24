/**
 * Notes HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { AccountResourceClient } from './resources/account.js';
import { FolderResourceClient } from './resources/folder.js';
import { NoteResourceClient } from './resources/note.js';
import { AttachmentResourceClient } from './resources/attachment.js';


/**
 * Client configuration options.
 */
export interface NotesClientOptions {
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
      const code = error.error?.code ?? 'UNKNOWN_ERROR';
      const message = error.error?.message ?? `HTTP ${String(response.status)}`;
      throw new NotesError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Notes API errors.
 */
export class NotesError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'NotesError';
    this.code = code;
  }
}

/**
 * Notes client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new NotesClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class NotesClient {
  readonly #httpClient: HttpClient;

  /** A Notes account */
  readonly accounts: AccountResourceClient;

  /** A Notes folder */
  readonly folders: FolderResourceClient;

  /** A note */
  readonly notes: NoteResourceClient;

  /** A note attachment */
  readonly attachments: AttachmentResourceClient;

  constructor(options: NotesClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.accounts = new AccountResourceClient(this.#httpClient, 'notes', 'accounts');
    this.folders = new FolderResourceClient(this.#httpClient, 'notes', 'folders');
    this.notes = new NoteResourceClient(this.#httpClient, 'notes', 'notes');
    this.attachments = new AttachmentResourceClient(this.#httpClient, 'notes', 'attachments');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

}
