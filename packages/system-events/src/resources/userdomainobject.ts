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
  async list(
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<UserDomainObject>> {
    return this.#http.invoke<Page<UserDomainObject>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'UserDomainObject'
    )
  }

  /**
   * Get a user domain object by kind.
   */
  async get(
    kind: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<UserDomainObject> {
    return this.#http.invoke<UserDomainObject>(
      `${this.#app}.${this.#resource}.get`,
      { kind },
      __mactsOptions,
      'UserDomainObject'
    )
  }
}
