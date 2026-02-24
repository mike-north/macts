/**
 * Assignment client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Assignment, AssignmentCreateInput, AssignmentUpdateInput } from '../types.js'

/**
 * Client for an assignment of a resource to a task.
 */
export class AssignmentResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all assignments.
   */
  async list(): Promise<Assignment[]> {
    return this.#http.rpc<Assignment[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a assignment by id.
   */
  async get(id: string): Promise<Assignment> {
    return this.#http.rpc<Assignment>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new assignment.
   */
  async create(input: AssignmentCreateInput): Promise<Assignment> {
    return this.#http.rpc<Assignment>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing assignment.
   */
  async update(id: string, input: AssignmentUpdateInput): Promise<Assignment> {
    return this.#http.rpc<Assignment>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a assignment.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
