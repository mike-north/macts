/**
 * Rule client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Rule, RuleCreateInput, RuleUpdateInput } from '../types.js'

/**
 * Client for class for message rules.
 */
export class RuleResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all rules.
   */
  async list(): Promise<Rule[]> {
    return this.#http.rpc<Rule[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a rule by id.
   */
  async get(id: string): Promise<Rule> {
    return this.#http.rpc<Rule>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new rule.
   */
  async create(input: RuleCreateInput): Promise<Rule> {
    return this.#http.rpc<Rule>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing rule.
   */
  async update(id: string, input: RuleUpdateInput): Promise<Rule> {
    return this.#http.rpc<Rule>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a rule.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
