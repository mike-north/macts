/**
 * Arc HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WindowResourceClient } from './resources/window.js';
import { TabResourceClient } from './resources/tab.js';
import { SpaceResourceClient } from './resources/space.js';


/**
 * Client configuration options.
 */
export interface ArcClientOptions {
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
      throw new ArcError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Arc API errors.
 */
export class ArcError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ArcError';
    this.code = code;
  }
}

/**
 * Arc client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new ArcClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class ArcClient {
  readonly #httpClient: HttpClient;

  /** An application's window */
  readonly windows: WindowResourceClient;

  /** A window's tab */
  readonly tabs: TabResourceClient;

  /** A space */
  readonly spaces: SpaceResourceClient;

  constructor(options: ArcClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.windows = new WindowResourceClient(this.#httpClient, 'arc', 'windows');
    this.tabs = new TabResourceClient(this.#httpClient, 'arc', 'tabs');
    this.spaces = new SpaceResourceClient(this.#httpClient, 'arc', 'spaces');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Make a new object.
   */
  async make(_new: string, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.make', { 'new': _new, withProperties });
  }


  /**
   * Return the number of elements of a particular class within an object.
   */
  async count(each?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.count', { each });
  }


  /**
   * Close
   */
  async close(): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.close', {});
  }


  /**
   * Select the tab.
   */
  async select(): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.select', {});
  }


  /**
   * Go Back (If Possible).
   */
  async goBack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.goBack', {});
  }


  /**
   * Go Forward (If Possible).
   */
  async goForward(): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.goForward', {});
  }


  /**
   * Reload a tab.
   */
  async reload(): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.reload', {});
  }


  /**
   * Stop the current tab from loading.
   */
  async stop(): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.stop', {});
  }


  /**
   * Execute a piece of javascript.
   */
  async execute(javascript: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.execute', { javascript });
  }


  /**
   * Focus on a space.
   */
  async focus(): Promise<void> {
    await this.#httpClient.rpc<undefined>('arc.app.focus', {});
  }
}
