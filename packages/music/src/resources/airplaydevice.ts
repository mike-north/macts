/**
 * AirPlayDevice client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { AirPlayDevice, AirPlayDeviceCreateInput, AirPlayDeviceUpdateInput } from '../types.js'

/**
 * Client for an airplay device.
 */
export class AirPlayDeviceResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all airplaydevices.
   */
  async list(): Promise<AirPlayDevice[]> {
    return this.#http.rpc<AirPlayDevice[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a airplaydevice by id.
   */
  async get(id: string): Promise<AirPlayDevice> {
    return this.#http.rpc<AirPlayDevice>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new airplaydevice.
   */
  async create(input: AirPlayDeviceCreateInput): Promise<AirPlayDevice> {
    return this.#http.rpc<AirPlayDevice>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing airplaydevice.
   */
  async update(id: string, input: AirPlayDeviceUpdateInput): Promise<AirPlayDevice> {
    return this.#http.rpc<AirPlayDevice>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a airplaydevice.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
