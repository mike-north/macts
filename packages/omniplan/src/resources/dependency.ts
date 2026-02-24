/**
 * Dependency client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Dependency, DependencyCreateInput, DependencyUpdateInput } from '../types.js'

/**
 * Client for a dependency of one task upon another task.
 */
export class DependencyResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all dependencies.
   */
  async list(): Promise<Dependency[]> {
    return this.#http.rpc<Dependency[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a dependency by id.
   */
  async get(id: string): Promise<Dependency> {
    return this.#http.rpc<Dependency>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new dependency.
   */
  async create(input: DependencyCreateInput): Promise<Dependency> {
    return this.#http.rpc<Dependency>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing dependency.
   */
  async update(id: string, input: DependencyUpdateInput): Promise<Dependency> {
    return this.#http.rpc<Dependency>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a dependency.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
