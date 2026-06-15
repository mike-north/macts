/**
 * Finder HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

/**
 * Client configuration options.
 */
export interface FinderClientOptions {
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
      throw new FinderError(code, message)
    }

    const result = (await response.json()) as { result: T }
    return result.result
  }
}

/**
 * Error class for Finder API errors.
 */
export class FinderError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FinderError'
    this.code = code
  }
}

/**
 * Finder client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new FinderClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class FinderClient {
  readonly #httpClient: HttpClient

  constructor(options: FinderClientOptions) {
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
   * Open the specified object(s)
   */
  async open(using?: string, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.open', { using, withProperties })
  }

  /**
   * Print the specified object(s)
   */
  async print(withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.print', { withProperties })
  }

  /**
   * Quit the Finder
   */
  async quit(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.quit', {})
  }

  /**
   * Activate the specified window (or the Finder)
   */
  async activate(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.activate', {})
  }

  /**
   * Close an object
   */
  async close(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.close', {})
  }

  /**
   * Return the number of elements of a particular class within an object
   */
  async count(each: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.count', { each })
  }

  /**
   * Return the size in bytes of an object
   */
  async dataSize(as?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.dataSize', { as })
  }

  /**
   * Move an item from its container to the trash
   */
  async _delete(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.delete', {})
  }

  /**
   * Duplicate one or more object(s)
   */
  async duplicate(
    to?: string,
    replacing?: boolean,
    routingSuppressed?: boolean,
    exactCopy?: boolean
  ): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.duplicate', {
      to,
      replacing,
      routingSuppressed,
      exactCopy,
    })
  }

  /**
   * Verify if an object exists
   */
  async exists(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.exists', {})
  }

  /**
   * Make a new element
   */
  async make(_new: string, at: string, to?: string, withProperties?: unknown): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.make', { new: _new, at, to, withProperties })
  }

  /**
   * Move object(s) to a new location
   */
  async move(
    to: string,
    replacing?: boolean,
    positionedAt?: string,
    routingSuppressed?: boolean
  ): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.move', {
      to,
      replacing,
      positionedAt,
      routingSuppressed,
    })
  }

  /**
   * Select the specified object(s)
   */
  async select(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.select', {})
  }

  /**
   * Private event to open a virtual location
   */
  async openVirtualLocation(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.openVirtualLocation', {})
  }

  /**
   * (NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)
   */
  async copy(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.copy', {})
  }

  /**
   * Return the specified object(s) in a sorted list
   */
  async sort(by: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.sort', { by })
  }

  /**
   * Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)
   */
  async cleanUp(by?: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.cleanUp', { by })
  }

  /**
   * Eject the specified disk(s)
   */
  async eject(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.eject', {})
  }

  /**
   * Empty the trash
   */
  async empty(security?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.empty', { security })
  }

  /**
   * (NOT AVAILABLE) Erase the specified disk(s)
   */
  async erase(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.erase', {})
  }

  /**
   * Bring the specified object(s) into view
   */
  async reveal(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.reveal', {})
  }

  /**
   * Update the display of the specified object(s) to match their on-disk representation
   */
  async update(necessity?: boolean, registeringApplications?: boolean): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.update', {
      necessity,
      registeringApplications,
    })
  }

  /**
   * Restart the computer
   */
  async restart(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.restart', {})
  }

  /**
   * Shut Down the computer
   */
  async shutDown(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.shutDown', {})
  }

  /**
   * Put the computer to sleep
   */
  async sleep(): Promise<void> {
    await this.#httpClient.rpc<undefined>('finder.app.sleep', {})
  }
}
