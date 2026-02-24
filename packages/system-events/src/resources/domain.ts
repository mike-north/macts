/**
 * Domain client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Domain, DomainCreateInput, DomainUpdateInput } from '../types.js'

/**
 * Client for a domain in the file system.
 */
export class DomainResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all domains.
   */
  async list(): Promise<Domain[]> {
    return this.#http.rpc<Domain[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a domain by id.
   */
  async get(id: string): Promise<Domain> {
    return this.#http.rpc<Domain>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new domain.
   */
  async create(input: DomainCreateInput): Promise<Domain> {
    return this.#http.rpc<Domain>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing domain.
   */
  async update(id: string, input: DomainUpdateInput): Promise<Domain> {
    return this.#http.rpc<Domain>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a domain.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
