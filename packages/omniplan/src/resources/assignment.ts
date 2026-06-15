/**
 * Assignment client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Assignment } from '../types.js'

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
    return this.#http.rpc<Assignment[]>(`${this.#app}.${this.#resource}.listAssignments`)
  }
}
