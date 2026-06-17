/**
 * BluetoothFileExchange HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

/**
 * Client configuration options.
 */
export interface BluetoothFileExchangeClientOptions {
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
      throw new BluetoothFileExchangeError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for BluetoothFileExchange API errors.
 */
export class BluetoothFileExchangeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'BluetoothFileExchangeError'
    this.code = code
  }
}

/**
 * BluetoothFileExchange client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new BluetoothFileExchangeClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class BluetoothFileExchangeClient {
  readonly #httpClient: HttpClient

  constructor(options: BluetoothFileExchangeClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372'
    this.#httpClient = new HttpClient(baseUrl, options.apiKey)
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient
  }

  /**
   * Browse a device
   */
  async browse(device?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('bluetooth-file-exchange.app.browse', { device })
  }

  /**
   * Send a file to a bluetooth device
   */
  async send(file?: string[], toDevice?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('bluetooth-file-exchange.app.send', { file, toDevice })
  }
}
