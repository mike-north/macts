/**
 * UIElement client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'

/**
 * Client for a piece of the user interface of a process.
 */
export class UIElementResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * cause the target process to behave as if the UI element were clicked.
   * macts does not yet send the UI element to the app, so the app acts on whatever it chooses.
   */
  async click(at?: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.click`, { at })
  }

  /**
   * set the selected property of the UI element.
   * macts does not yet send the UI element to the app, so the app acts on whatever it chooses.
   */
  async select(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.select`, {})
  }
}
