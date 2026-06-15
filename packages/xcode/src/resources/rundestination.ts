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
   * List all rundestinations.
   */
  async list(): Promise<RunDestination[]> {
    return this.#http.rpc<RunDestination[]>(`${this.#app}.${this.#resource}.listRunDestinations`)
  }

  /**
   * Get a rundestination by name.
   */
  async get(name: string): Promise<RunDestination> {
    return this.#http.rpc<RunDestination>(`${this.#app}.${this.#resource}.getRunDestination`, {
      name,
    })
  }
}
