/**
 * Variable client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Variable } from '../types.js'

/**
 * Client for a variable used by the workflow.
 */
export class VariableResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all variables.
   */
  async list(): Promise<Variable[]> {
    return this.#http.rpc<Variable[]>(`${this.#app}.${this.#resource}.listVariables`)
  }

  /**
   * Get a variable by id.
   */
  async get(id: string): Promise<Variable> {
    return this.#http.rpc<Variable>(`${this.#app}.${this.#resource}.getVariable`, { id })
  }
}
