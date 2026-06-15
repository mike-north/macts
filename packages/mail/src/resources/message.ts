/**
 * Message client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for an email message.
 */
export class MessageResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * Does nothing at all (deprecated)
   */
  async bounce(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.bounce`, {})
  }

  /**
   * Creates a forwarded message.
   */
  async forward(openingWindow?: boolean): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.forward`, { openingWindow })
  }

  /**
   * Creates a redirected message.
   */
  async redirect(openingWindow?: boolean): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.redirect`, { openingWindow })
  }

  /**
   * Creates a reply message.
   */
  async reply(openingWindow?: boolean, replyToAll?: boolean): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.reply`, {
      openingWindow,
      replyToAll,
    })
  }
}
