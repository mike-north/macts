/**
 * UserDomainObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { UserDomainObject } from '../types.js'

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
   * List all user domain objects, as one page.
   */
  async list(): Promise<Page<UserDomainObject>> {
    return this.#http.rpc<Page<UserDomainObject>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a user domain object by kind.
   */
  async get(kind: string): Promise<UserDomainObject> {
    return this.#http.rpc<UserDomainObject>(`${this.#app}.${this.#resource}.get`, { kind })
  }
}
