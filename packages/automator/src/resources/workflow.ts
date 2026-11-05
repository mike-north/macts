/**
 * Workflow client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Workflow } from '../types.js'

/**
 * Client for a series of actions stored in a file.
 */
export class WorkflowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all workflows, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Workflow>> {
    return this.#http.invoke<Page<Workflow>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Workflow'
    )
  }

  /**
   * Get a workflow by name.
   * When several workflows share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Workflow> {
    return this.#http.invoke<Workflow>(
      `${this.#app}.${this.#resource}.get`,
      { name },
      __mactsOptions,
      'Workflow'
    )
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflow: unknown,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.execute`,
      { workflow },
      __mactsOptions,
      'Workflow'
    )
  }
}
