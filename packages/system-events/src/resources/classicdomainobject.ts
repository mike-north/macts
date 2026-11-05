/**
 * ClassicDomainObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { ClassicDomainObject } from '../types.js'

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
   * List all classic domain objects, as one page.
   */
  async list(): Promise<Page<ClassicDomainObject>> {
    return this.#http.rpc<Page<ClassicDomainObject>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a classic domain object by kind.
   */
  async get(kind: string): Promise<ClassicDomainObject> {
    return this.#http.rpc<ClassicDomainObject>(`${this.#app}.${this.#resource}.get`, { kind })
  }
}
