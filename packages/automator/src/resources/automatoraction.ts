/**
 * AutomatorAction client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { AutomatorAction } from '../types.js'

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
   * List the automator actions of one workflow, as one page.
   */
  async list(workflowName: string): Promise<{ items: AutomatorAction[] }> {
    return this.#http.rpc<{ items: AutomatorAction[] }>(`${this.#app}.${this.#resource}.list`, {
      workflowName,
    })
  }

  /**
   * Get a automator action by id.
   */
  async get(id: string): Promise<AutomatorAction> {
    return this.#http.rpc<AutomatorAction>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
