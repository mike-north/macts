/**
 * AutomatorAction client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  AutomatorAction,
  AutomatorActionCreateInput,
  AutomatorActionUpdateInput,
} from '../types.js'

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
   * List all automatoractions.
   */
  async list(): Promise<AutomatorAction[]> {
    return this.#http.rpc<AutomatorAction[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a automatoraction by id.
   */
  async get(id: string): Promise<AutomatorAction> {
    return this.#http.rpc<AutomatorAction>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new automatoraction.
   */
  async create(input: AutomatorActionCreateInput): Promise<AutomatorAction> {
    return this.#http.rpc<AutomatorAction>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing automatoraction.
   */
  async update(id: string, input: AutomatorActionUpdateInput): Promise<AutomatorAction> {
    return this.#http.rpc<AutomatorAction>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a automatoraction.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
