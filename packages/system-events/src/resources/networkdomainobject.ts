/**
 * NetworkDomainObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  NetworkDomainObject,
  NetworkDomainObjectCreateInput,
  NetworkDomainObjectUpdateInput,
} from '../types.js'

/**
 * Client for the network domain in the file system.
 */
export class NetworkDomainObjectResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all networkdomainobjects.
   */
  async list(): Promise<NetworkDomainObject[]> {
    return this.#http.rpc<NetworkDomainObject[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a networkdomainobject by id.
   */
  async get(id: string): Promise<NetworkDomainObject> {
    return this.#http.rpc<NetworkDomainObject>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new networkdomainobject.
   */
  async create(input: NetworkDomainObjectCreateInput): Promise<NetworkDomainObject> {
    return this.#http.rpc<NetworkDomainObject>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing networkdomainobject.
   */
  async update(id: string, input: NetworkDomainObjectUpdateInput): Promise<NetworkDomainObject> {
    return this.#http.rpc<NetworkDomainObject>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a networkdomainobject.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
