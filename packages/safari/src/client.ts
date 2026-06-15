/**
 * Safari HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

/**
 * Client configuration options.
 */
export interface SafariClientOptions {
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
      throw new SafariError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Safari API errors.
 */
export class SafariError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SafariError'
    this.code = code
  }
}

/**
 * Safari client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new SafariClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class SafariClient {
  readonly #httpClient: HttpClient

  constructor(options: SafariClientOptions) {
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
   * Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.
   */
  async addReadingListItem(andPreviewText?: string, withTitle?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.addReadingListItem', {
      andPreviewText,
      withTitle,
    })
  }

  /**
   * Applies a string of JavaScript code to a document.
   */
  async doJavaScript(_in?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.doJavaScript', { in: _in })
  }

  /**
   * Emails the contents of a tab.
   */
  async emailContents(_of?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.emailContents', { of: _of })
  }

  /**
   * Searches the web using Safari's current search provider.
   */
  async searchTheWeb(_for: string, _in?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.searchTheWeb', { in: _in, for: _for })
  }

  /**
   * Shows Safari's bookmarks.
   */
  async showBookmarks(): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.showBookmarks', {})
  }

  /**
   * Show Safari Extensions preferences.
   */
  async showExtensionsPreferences(): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.showExtensionsPreferences', {})
  }

  /**
   * Dispatch a message to a Safari Extension.
   */
  async dispatchMessageToExtension(): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.dispatchMessageToExtension', {})
  }

  /**
   * Make sure that all in-memory structures are in-sync with their on-disk counterparts.
   */
  async syncAllPlistToDisk(): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.syncAllPlistToDisk', {})
  }

  /**
   * Show Safari's Privacy Report
   */
  async showPrivacyReport(): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.showPrivacyReport', {})
  }

  /**
   * Show Safari Credit Card Settings.
   */
  async showCreditCardSettings(): Promise<void> {
    await this.#httpClient.rpc<undefined>('safari.app.showCreditCardSettings', {})
  }
}
