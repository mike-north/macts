/**
 * RunDestination client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { RunDestination } from '../types.js'

/**
 * Client for an object which specifies parameters such as the device and architecture for which to perform a scheme action.
 */
export class RunDestinationResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all run destinations.
   */
  async list(workspaceName: string): Promise<RunDestination[]> {
    return this.#http.rpc<RunDestination[]>(`${this.#app}.${this.#resource}.list`, {
      workspaceName,
    })
  }

  /**
   * Get a run destination by name.
   */
  async get(name: string): Promise<RunDestination> {
    return this.#http.rpc<RunDestination>(`${this.#app}.${this.#resource}.get`, { name })
  }
}
