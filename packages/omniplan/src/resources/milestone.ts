/**
 * Milestone client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Milestone, MilestoneCreateInput } from '../types.js'

/**
 * Client for a milestone (zero-duration marker task).
 */
export class MilestoneResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List milestones, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Milestone[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Milestone[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a milestone by id.
   */
  async get(id: string): Promise<Milestone> {
    return this.#http.rpc<Milestone>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new milestone.
   */
  async create(input: MilestoneCreateInput): Promise<Milestone> {
    return this.#http.rpc<Milestone>(`${this.#app}.${this.#resource}.create`, input)
  }
}
