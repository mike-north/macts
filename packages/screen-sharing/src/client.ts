/**
 * ScreenSharing HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ConnectionResourceClient } from './resources/connection.js';


/**
 * Client configuration options.
 */
export interface ScreenSharingClientOptions {
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
      throw new ScreenSharingError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for ScreenSharing API errors.
 */
export class ScreenSharingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ScreenSharingError';
    this.code = code;
  }
}

/**
 * ScreenSharing client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new ScreenSharingClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class ScreenSharingClient {
  readonly #httpClient: HttpClient;

  /** A screen sharing connection */
  readonly connections: ConnectionResourceClient;

  constructor(options: ScreenSharingClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.connections = new ConnectionResourceClient(this.#httpClient, 'screen-sharing', 'connections');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Open a vnc URL
   */
  async getURL(url: string): Promise<void> {
    return this.#httpClient.rpc<void>('screen-sharing.app.getURL', { url });
  }
}
