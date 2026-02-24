/**
 * Subgraph client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Subgraph, SubgraphCreateInput, SubgraphUpdateInput } from '../types.js'

/**
 * Client for a subgraph container in omnigraffle.
 */
export class SubgraphResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all subgraphs.
   */
  async list(): Promise<Subgraph[]> {
    return this.#http.rpc<Subgraph[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a subgraph by id.
   */
  async get(id: string): Promise<Subgraph> {
    return this.#http.rpc<Subgraph>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new subgraph.
   */
  async create(input: SubgraphCreateInput): Promise<Subgraph> {
    return this.#http.rpc<Subgraph>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing subgraph.
   */
  async update(id: string, input: SubgraphUpdateInput): Promise<Subgraph> {
    return this.#http.rpc<Subgraph>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a subgraph.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
