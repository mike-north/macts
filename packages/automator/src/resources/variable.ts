/**
 * Variable client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List the variables of one workflow, as one page.
   * When several workflows share the same name, the first match in the app's order is used as the workflow.
   */
  async list(workflowName: string): Promise<Page<Variable>> {
    return this.#http.rpc<Page<Variable>>(`${this.#app}.${this.#resource}.list`, { workflowName })
  }

  /**
   * Get a variable by id.
   */
  async get(id: string): Promise<Variable> {
    return this.#http.rpc<Variable>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
