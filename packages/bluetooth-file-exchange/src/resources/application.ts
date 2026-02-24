/**
 * Application client for Bluetooth File Exchange SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Application, ApplicationCreateInput, ApplicationUpdateInput } from '../types.js'

/**
 * Client for the bluetooth file exchange application.
 */
export class ApplicationResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all applications.
   */
  async list(): Promise<Application[]> {
    return this.#http.rpc<Application[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a application by name.
   */
  async get(name: string): Promise<Application> {
    return this.#http.rpc<Application>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new application.
   */
  async create(input: ApplicationCreateInput): Promise<Application> {
    return this.#http.rpc<Application>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing application.
   */
  async update(name: string, input: ApplicationUpdateInput): Promise<Application> {
    return this.#http.rpc<Application>(`${this.#app}.${this.#resource}.update`, { name, ...input })
  }

  /**
   * Delete a application.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name })
  }
}
