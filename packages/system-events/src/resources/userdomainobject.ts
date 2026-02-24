/**
 * UserDomainObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  UserDomainObject,
  UserDomainObjectCreateInput,
  UserDomainObjectUpdateInput,
} from '../types.js'

/**
 * Client for the user domain in the file system.
 */
export class UserDomainObjectResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all userdomainobjects.
   */
  async list(): Promise<UserDomainObject[]> {
    return this.#http.rpc<UserDomainObject[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a userdomainobject by id.
   */
  async get(id: string): Promise<UserDomainObject> {
    return this.#http.rpc<UserDomainObject>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new userdomainobject.
   */
  async create(input: UserDomainObjectCreateInput): Promise<UserDomainObject> {
    return this.#http.rpc<UserDomainObject>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing userdomainobject.
   */
  async update(id: string, input: UserDomainObjectUpdateInput): Promise<UserDomainObject> {
    return this.#http.rpc<UserDomainObject>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a userdomainobject.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
