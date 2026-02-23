/**
 * iTerm HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WindowResourceClient } from './resources/window.js';
import { TabResourceClient } from './resources/tab.js';
import { SessionResourceClient } from './resources/session.js';


/**
 * Client configuration options.
 */
export interface iTermClientOptions {
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
      throw new iTermError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for iTerm API errors.
 */
export class iTermError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'iTermError';
    this.code = code;
  }
}

/**
 * iTerm client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new iTermClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class iTermClient {
  readonly #httpClient: HttpClient;

  /** A window. */
  readonly windows: WindowResourceClient;

  /** A terminal tab */
  readonly tabs: TabResourceClient;

  /** A terminal session */
  readonly sessions: SessionResourceClient;

  constructor(options: iTermClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.windows = new WindowResourceClient(this.#httpClient, 'iterm', 'windows');
    this.tabs = new TabResourceClient(this.#httpClient, 'iterm', 'tabs');
    this.sessions = new SessionResourceClient(this.#httpClient, 'iterm', 'sessions');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Return the number of elements of a particular class within an object.
   */
  async count(each?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.count', { each });
  }


  /**
   * Delete an object.
   */
  async _delete(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.delete', {});
  }


  /**
   * Copy object(s) and put the copies at a new location.
   */
  async duplicate(to: string, withProperties?: unknown): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.duplicate', { to, withProperties });
  }


  /**
   * Verify if an object exists.
   */
  async exists(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.exists', {});
  }


  /**
   * Make a new object.
   */
  async make(_new: string, at?: string, withData?: unknown, withProperties?: unknown): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.make', { 'new': _new, at, withData, withProperties });
  }


  /**
   * Move object(s) to a new location.
   */
  async move(to: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.move', { to });
  }


  /**
   * Close a document.
   */
  async close(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.close', {});
  }


  /**
   * Request a Python API cookie
   */
  async requestCookie(andKeyForAppNamed?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.requestCookie', { andKeyForAppNamed });
  }


  /**
   * Create a new tab
   */
  async createTab(withProfile: string, command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.createTab', { withProfile, command });
  }


  /**
   * Create a new tab with the default profile
   */
  async createTabWithDefaultProfile(command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.createTabWithDefaultProfile', { command });
  }


  /**
   * Create a new window
   */
  async createWindowWithProfile(command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.createWindowWithProfile', { command });
  }


  /**
   * Create a hotkey window
   */
  async createHotkeyWindowWithProfile(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.createHotkeyWindowWithProfile', {});
  }


  /**
   * Launch API script by name
   */
  async launchAPIScriptNamed(_arguments?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.launchAPIScriptNamed', { 'arguments': _arguments });
  }


  /**
   * Invokes an expression, such as a registered function.
   */
  async invokeAPIExpression(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.invokeAPIExpression', {});
  }


  /**
   * Create a new window with the default profile
   */
  async createWindowWithDefaultProfile(command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.createWindowWithDefaultProfile', { command });
  }


  /**
   * Send text as though it was typed.
   */
  async write(contentsOfFile?: string, text?: string, newline?: boolean): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.write', { contentsOfFile, text, newline });
  }


  /**
   * Make receiver visible and selected.
   */
  async select(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.select', {});
  }


  /**
   * Split a session vertically.
   */
  async splitVertically(withProfile: string, command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.splitVertically', { withProfile, command });
  }


  /**
   * Split a session vertically, using the default profile for the new session
   */
  async splitVerticallyWithDefaultProfile(command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.splitVerticallyWithDefaultProfile', { command });
  }


  /**
   * Split a session vertically, using the original session's profile for the new session
   */
  async splitVerticallyWithSameProfile(command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.splitVerticallyWithSameProfile', { command });
  }


  /**
   * Split a session horizontally.
   */
  async splitHorizontally(withProfile: string, command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.splitHorizontally', { withProfile, command });
  }


  /**
   * Split a session horizontally, using the default profile for the new session
   */
  async splitHorizontallyWithDefaultProfile(command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.splitHorizontallyWithDefaultProfile', { command });
  }


  /**
   * Split a session horizontally, using the original session's profile for the new session
   */
  async splitHorizontallyWithSameProfile(command?: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.splitHorizontallyWithSameProfile', { command });
  }


  /**
   * Returns the value of a session variable with the given name
   */
  async variable(named: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.variable', { named });
  }


  /**
   * Sets the value of a session variable
   */
  async setVariable(named: string, to: string): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.setVariable', { named, to });
  }


  /**
   * Reveals a hotkey window. Only to be called on windows that are hotkey windows.
   */
  async revealHotkeyWindow(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.revealHotkeyWindow', {});
  }


  /**
   * Hides a hotkey window. Only to be called on windows that are hotkey windows.
   */
  async hideHotkeyWindow(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.hideHotkeyWindow', {});
  }


  /**
   * Toggles the visibility of a hotkey window. Only to be called on windows that are hotkey windows.
   */
  async toggleHotkeyWindow(): Promise<void> {
    return this.#httpClient.rpc<void>('iterm.app.toggleHotkeyWindow', {});
  }
}
