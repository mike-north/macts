/**
 * InternetLocationFile client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  InternetLocationFile,
  InternetLocationFileCreateInput,
  InternetLocationFileUpdateInput,
} from '../types.js'

/**
 * Client for a file containing an internet location.
 */
export class InternetLocationFileResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all internetlocationfiles.
   */
  async list(): Promise<InternetLocationFile[]> {
    return this.#http.rpc<InternetLocationFile[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a internetlocationfile by id.
   */
  async get(id: string): Promise<InternetLocationFile> {
    return this.#http.rpc<InternetLocationFile>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new internetlocationfile.
   */
  async create(input: InternetLocationFileCreateInput): Promise<InternetLocationFile> {
    return this.#http.rpc<InternetLocationFile>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing internetlocationfile.
   */
  async update(id: string, input: InternetLocationFileUpdateInput): Promise<InternetLocationFile> {
    return this.#http.rpc<InternetLocationFile>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a internetlocationfile.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
