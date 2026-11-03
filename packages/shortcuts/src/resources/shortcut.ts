/**
 * Shortcut client for Shortcuts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Shortcut } from '../types.js'

/**
 * Client for a shortcut in the shortcuts application.
 */
export class ShortcutResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List shortcuts, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Shortcut[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Shortcut[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a shortcut by id.
   */
  async get(id: string): Promise<Shortcut> {
    return this.#http.rpc<Shortcut>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.
   */
  async run(id: string, withInput?: unknown): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.run`, { id, withInput })
  }
}
