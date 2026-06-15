/**
 * AutomatorAction client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { AutomatorAction } from '../types.js'

/**
 * Client for a single step in a workflow.
 */
export class AutomatorActionResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all automatoractions.
   */
  async list(): Promise<AutomatorAction[]> {
    return this.#http.rpc<AutomatorAction[]>(`${this.#app}.${this.#resource}.listActions`)
  }

  /**
   * Get a automatoraction by id.
   */
  async get(id: string): Promise<AutomatorAction> {
    return this.#http.rpc<AutomatorAction>(`${this.#app}.${this.#resource}.getAction`, { id })
  }
}
