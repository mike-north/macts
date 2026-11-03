/**
 * Scenario client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Scenario } from '../types.js'

/**
 * Client for an alternative project plan.
 */
export class ScenarioResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List scenarios, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(page: { pageSize?: number; cursor?: string } = {}): Promise<Page<Scenario>> {
    return this.#http.rpc<Page<Scenario>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
    })
  }

  /**
   * Get a scenario by id.
   */
  async get(id: string): Promise<Scenario> {
    return this.#http.rpc<Scenario>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
