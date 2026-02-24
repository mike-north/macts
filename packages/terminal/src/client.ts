/**
 * Terminal HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { WindowResourceClient } from './resources/window.js'
import { TabResourceClient } from './resources/tab.js'
import { SettingsSetResourceClient } from './resources/settingsset.js'

/**
 * Client configuration options.
 */
export interface TerminalClientOptions {
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
      throw new TerminalError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Terminal API errors.
 */
export class TerminalError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'TerminalError'
    this.code = code
  }
}

/**
 * Terminal client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new TerminalClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class TerminalClient {
  readonly #httpClient: HttpClient

  /** A Terminal window */
  readonly windows: WindowResourceClient

  /** A Terminal tab */
  readonly tabs: TabResourceClient

  /** A Terminal settings set (profile) */
  readonly settingssets: SettingsSetResourceClient

  constructor(options: TerminalClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.windows = new WindowResourceClient(this.#httpClient, 'terminal', 'windows')
    this.tabs = new TabResourceClient(this.#httpClient, 'terminal', 'tabs')
    this.settingssets = new SettingsSetResourceClient(this.#httpClient, 'terminal', 'settingssets')
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Execute a shell command in a Terminal window or tab
   */
  async doScript(command: string, _in?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('terminal.app.doScript', { command, in: _in })
  }
}
