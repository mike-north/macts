/**
 * AutomatorAction client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * When several workflows share the same name, the first match in the app's order is used as the workflow.
   */
  async list(
    workflowName: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<AutomatorAction>> {
    return this.#http.invoke<Page<AutomatorAction>>(
      `${this.#app}.${this.#resource}.list`,
      { workflowName },
      __mactsOptions
    )
  }

  /**
   * Get a automator action by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<AutomatorAction> {
    return this.#http.invoke<AutomatorAction>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions
    )
  }
}
