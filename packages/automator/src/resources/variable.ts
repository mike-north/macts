/**
 * Variable client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Variable } from '../types.js'

/**
 * Client for a variable used by the workflow.
 */
export class VariableResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List variables, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    workflowName: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Variable[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Variable[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        workflowName,
      }
    )
  }

  /**
   * Get a variable by id.
   */
  async get(id: string): Promise<Variable> {
    return this.#http.rpc<Variable>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
