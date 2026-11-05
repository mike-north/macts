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
  async bounce(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.bounce`,
      {},
      __mactsOptions,
      'Message'
    )
  }

  /**
   * Creates a forwarded message.
   */
  async forward(
    openingWindow?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.forward`,
      { openingWindow },
      __mactsOptions,
      'Message'
    )
  }

  /**
   * Creates a redirected message.
   */
  async redirect(
    openingWindow?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.redirect`,
      { openingWindow },
      __mactsOptions,
      'Message'
    )
  }

  /**
   * Creates a reply message.
   */
  async reply(
    openingWindow?: boolean,
    replyToAll?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.reply`,
      { openingWindow, replyToAll },
      __mactsOptions,
      'Message'
    )
  }
}
