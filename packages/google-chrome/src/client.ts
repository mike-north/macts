/**
 * GoogleChrome HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WindowResourceClient } from './resources/window.js';
import { TabResourceClient } from './resources/tab.js';
import { BookmarkFolderResourceClient } from './resources/bookmarkfolder.js';
import { BookmarkItemResourceClient } from './resources/bookmarkitem.js';


/**
 * Client configuration options.
 */
export interface GoogleChromeClientOptions {
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
      throw new GoogleChromeError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for GoogleChrome API errors.
 */
export class GoogleChromeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GoogleChromeError';
    this.code = code;
  }
}

/**
 * GoogleChrome client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new GoogleChromeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class GoogleChromeClient {
  readonly #httpClient: HttpClient;

  /** A window. */
  readonly windows: WindowResourceClient;

  /** A tab. */
  readonly tabs: TabResourceClient;

  /** A bookmarks folder that contains other bookmarks folder and bookmark items. */
  readonly bookmarkfolders: BookmarkFolderResourceClient;

  /** An item consists of an URL and the title of a bookmark */
  readonly bookmarkitems: BookmarkItemResourceClient;

  constructor(options: GoogleChromeClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.windows = new WindowResourceClient(this.#httpClient, 'google-chrome', 'windows');
    this.tabs = new TabResourceClient(this.#httpClient, 'google-chrome', 'tabs');
    this.bookmarkfolders = new BookmarkFolderResourceClient(this.#httpClient, 'google-chrome', 'bookmarkfolders');
    this.bookmarkitems = new BookmarkItemResourceClient(this.#httpClient, 'google-chrome', 'bookmarkitems');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Save an object.
   */
  async save(_in?: string, as?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.save', { 'in': _in, as });
  }


  /**
   * Open a document.
   */
  async open(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.open', {});
  }


  /**
   * Close a window.
   */
  async close(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.close', {});
  }


  /**
   * Quit the application.
   */
  async quit(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.quit', {});
  }


  /**
   * Return the number of elements of a particular class within an object.
   */
  async count(each?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.count', { each });
  }


  /**
   * Delete an object.
   */
  async _delete(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.delete', {});
  }


  /**
   * Copy object(s) and put the copies at a new location.
   */
  async duplicate(to?: string, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.duplicate', { to, withProperties });
  }


  /**
   * Verify if an object exists.
   */
  async exists(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.exists', {});
  }


  /**
   * Make a new object.
   */
  async make(_new: string, at?: string, withData?: unknown, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.make', { 'new': _new, at, withData, withProperties });
  }


  /**
   * Move object(s) to a new location.
   */
  async move(to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.move', { to });
  }


  /**
   * Print an object.
   */
  async print(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.print', {});
  }


  /**
   * Reload a tab.
   */
  async reload(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.reload', {});
  }


  /**
   * Go Back (If Possible).
   */
  async goBack(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.goBack', {});
  }


  /**
   * Go Forward (If Possible).
   */
  async goForward(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.goForward', {});
  }


  /**
   * Select all.
   */
  async selectAll(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.selectAll', {});
  }


  /**
   * Cut selected text (If Possible).
   */
  async cutSelection(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.cutSelection', {});
  }


  /**
   * Copy text.
   */
  async copySelection(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.copySelection', {});
  }


  /**
   * Paste text (If Possible).
   */
  async pasteSelection(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.pasteSelection', {});
  }


  /**
   * Undo the last change.
   */
  async undo(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.undo', {});
  }


  /**
   * Redo the last change.
   */
  async redo(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.redo', {});
  }


  /**
   * Stop the current tab from loading.
   */
  async stop(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.stop', {});
  }


  /**
   * View the HTML source of the tab.
   */
  async viewSource(): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.viewSource', {});
  }


  /**
   * Execute a piece of javascript.
   */
  async execute(javascript: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('google-chrome.app.execute', { javascript });
  }
}
