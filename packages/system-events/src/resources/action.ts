/**
 * Action client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for an action that can be performed on the ui element.
 */
export class ActionResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * cause the target process to behave as if the action were applied to its UI element
   */
  async perform(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.perform`, {})
  }
}
