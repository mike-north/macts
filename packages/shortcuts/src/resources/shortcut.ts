/**
 * Shortcut client for Shortcuts SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all shortcuts, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Shortcut>> {
    return this.#http.invoke<Page<Shortcut>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Shortcut'
    )
  }

  /**
   * Get a shortcut by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Shortcut> {
    return this.#http.invoke<Shortcut>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Shortcut'
    )
  }

  /**
   * Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.
   */
  async run(
    id: string,
    withInput?: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.run`,
      { id, withInput },
      __mactsOptions,
      'Shortcut'
    )
  }
}
