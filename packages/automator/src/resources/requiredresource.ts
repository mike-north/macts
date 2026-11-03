/**
 * RequiredResource client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { RequiredResource } from '../types.js'

/**
 * Client for a resource required for proper operation of the action.
 */
export class RequiredResourceResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all required resources, as one page.
   */
  async list(actionId: string): Promise<{ items: RequiredResource[] }> {
    return this.#http.rpc<{ items: RequiredResource[] }>(`${this.#app}.${this.#resource}.list`, {
      actionId,
    })
  }
}
