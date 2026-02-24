/**
 * Url client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Url, UrlCreateInput, UrlUpdateInput } from '../types.js'

/**
 * Client for urls for this person..
 */
export class UrlResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all urls.
   */
  async list(): Promise<Url[]> {
    return this.#http.rpc<Url[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a url by id.
   */
  async get(id: string): Promise<Url> {
    return this.#http.rpc<Url>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new url.
   */
  async create(input: UrlCreateInput): Promise<Url> {
    return this.#http.rpc<Url>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing url.
   */
  async update(id: string, input: UrlUpdateInput): Promise<Url> {
    return this.#http.rpc<Url>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a url.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
