/**
 * AutomatorAction client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { AutomatorAction } from '../types.js'

/**
 * Client for a single step in a workflow.
 */
export class AutomatorActionResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the automator actions of one workflow, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    workflowName: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<Page<AutomatorAction>> {
    return this.#http.rpc<Page<AutomatorAction>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      workflowName,
    })
  }

  /**
   * Get a automator action by id.
   */
  async get(id: string): Promise<AutomatorAction> {
    return this.#http.rpc<AutomatorAction>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
