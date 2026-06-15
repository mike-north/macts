/**
 * SystemSettings HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { PaneResourceClient } from './resources/pane.js'

/**
 * Client configuration options.
 */
export interface SystemSettingsClientOptions {
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
      throw new SystemSettingsError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for SystemSettings API errors.
 */
export class SystemSettingsError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SystemSettingsError'
    this.code = code
  }
}

/**
 * SystemSettings client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SystemSettingsClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class SystemSettingsClient {
  readonly #httpClient: HttpClient

  /** A settings pane. */
  readonly panes: PaneResourceClient

  constructor(options: SystemSettingsClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
    this.panes = new PaneResourceClient(this.#httpClient, 'system-settings', 'panes')
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Reveals a settings pane or an anchor within a pane.
   */
  async reveal(): Promise<void> {
    await this.#httpClient.rpc<undefined>('system-settings.app.reveal', {})
  }
}
