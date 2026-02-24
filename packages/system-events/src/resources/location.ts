/**
 * Location client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Location, LocationCreateInput, LocationUpdateInput } from '../types.js'

/**
 * Client for a set of services.
 */
export class LocationResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all locations.
   */
  async list(): Promise<Location[]> {
    return this.#http.rpc<Location[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a location by id.
   */
  async get(id: string): Promise<Location> {
    return this.#http.rpc<Location>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new location.
   */
  async create(input: LocationCreateInput): Promise<Location> {
    return this.#http.rpc<Location>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing location.
   */
  async update(id: string, input: LocationUpdateInput): Promise<Location> {
    return this.#http.rpc<Location>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a location.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
