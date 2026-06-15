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
   * List all requiredresources.
   */
  async list(): Promise<RequiredResource[]> {
    return this.#http.rpc<RequiredResource[]>(
      `${this.#app}.${this.#resource}.listRequiredResources`
    )
  }

  /**
   * Get a requiredresource by name.
   */
  async get(name: string): Promise<RequiredResource> {
    return this.#http.rpc<RequiredResource>(`${this.#app}.${this.#resource}.getRequiredResource`, {
      name,
    })
  }
}
