/**
 * Violation client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Violation, ViolationCreateInput, ViolationUpdateInput } from '../types.js'

/**
 * Client for a scheduling conflict or issue.
 */
export class ViolationResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all violations.
   */
  async list(): Promise<Violation[]> {
    return this.#http.rpc<Violation[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a violation by id.
   */
  async get(id: string): Promise<Violation> {
    return this.#http.rpc<Violation>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new violation.
   */
  async create(input: ViolationCreateInput): Promise<Violation> {
    return this.#http.rpc<Violation>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing violation.
   */
  async update(id: string, input: ViolationUpdateInput): Promise<Violation> {
    return this.#http.rpc<Violation>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a violation.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }

  /**
   * Fix a violation
   */
  async fix(): Promise<void> {
    await this.#http.rpc<undefined>('omniplan.violations.fix', {})
  }
}
