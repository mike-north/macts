/**
 * Pane client for System Settings SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for a settings pane..
 */
export class PaneResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * Prompt for authorization for a settings pane. Deprecated: no longer does anything.
   */
  async authorize(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.authorize`, {})
  }

  /**
   * Times and loads given settings pane and returns load time. Deprecated: no longer does anything.
   */
  async timedLoad(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.timedLoad`, {})
  }
}
