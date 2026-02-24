/**
 * Milestone client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Milestone, MilestoneCreateInput, MilestoneUpdateInput } from '../types.js'

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
   * List all milestones.
   */
  async list(): Promise<Milestone[]> {
    return this.#http.rpc<Milestone[]>(`${this.#app}.${this.#resource}.list`)
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

  /**
   * Update an existing milestone.
   */
  async update(id: string, input: MilestoneUpdateInput): Promise<Milestone> {
    return this.#http.rpc<Milestone>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a milestone.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
