/**
 * Milestone client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all milestones, as one page.
   */
  async list(): Promise<Page<Milestone>> {
    return this.#http.rpc<Page<Milestone>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a milestone by id.
   */
  async get(id: string | number): Promise<Milestone> {
    return this.#http.rpc<Milestone>(`${this.#app}.${this.#resource}.get`, {
      id: { integer: String(id) },
    })
  }

  /**
   * Create a new milestone.
   */
  async create(input: MilestoneCreateInput): Promise<Milestone> {
    return this.#http.rpc<Milestone>(`${this.#app}.${this.#resource}.create`, input)
  }
}
