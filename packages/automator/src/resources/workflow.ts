/**
 * Workflow client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Workflow } from '../types.js'

/**
 * Client for a series of actions stored in a file.
 */
export class WorkflowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List workflows, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Workflow[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Workflow[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a workflow by name.
   */
  async get(name: string): Promise<Workflow> {
    return this.#http.rpc<Workflow>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Execute a workflow
   */
  async execute(workflow: unknown): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.execute`, { workflow })
  }
}
