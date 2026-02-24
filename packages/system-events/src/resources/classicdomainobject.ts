/**
 * ClassicDomainObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  ClassicDomainObject,
  ClassicDomainObjectCreateInput,
  ClassicDomainObjectUpdateInput,
} from '../types.js'

/**
 * Client for the classic domain in the file system.
 */
export class ClassicDomainObjectResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all classicdomainobjects.
   */
  async list(): Promise<ClassicDomainObject[]> {
    return this.#http.rpc<ClassicDomainObject[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a classicdomainobject by id.
   */
  async get(id: string): Promise<ClassicDomainObject> {
    return this.#http.rpc<ClassicDomainObject>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new classicdomainobject.
   */
  async create(input: ClassicDomainObjectCreateInput): Promise<ClassicDomainObject> {
    return this.#http.rpc<ClassicDomainObject>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing classicdomainobject.
   */
  async update(id: string, input: ClassicDomainObjectUpdateInput): Promise<ClassicDomainObject> {
    return this.#http.rpc<ClassicDomainObject>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a classicdomainobject.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
