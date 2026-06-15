/**
 * OutgoingMessage client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for a new email message.
 */
export class OutgoingMessageResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * Sends a message.
   */
  async send(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.send`, {})
  }
}
