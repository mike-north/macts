/**
 * SystemInformation HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { DocumentResourceClient } from './resources/document.js';


/**
 * Client configuration options.
 */
export interface SystemInformationClientOptions {
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
      throw new SystemInformationError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for SystemInformation API errors.
 */
export class SystemInformationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SystemInformationError';
    this.code = code;
  }
}

/**
 * SystemInformation client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SystemInformationClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class SystemInformationClient {
  readonly #httpClient: HttpClient;

  /** A system profile document */
  readonly documents: DocumentResourceClient;

  constructor(options: SystemInformationClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.documents = new DocumentResourceClient(this.#httpClient, 'system-information', 'documents');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Send system information to AppleCare
   */
  async send(): Promise<void> {
    return this.#httpClient.rpc<void>('system-information.app.send', {});
  }
}
