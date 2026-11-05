/**
 * Scenario client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Scenario } from '../types.js'

/**
 * Client for an alternative project plan.
 */
export class ScenarioResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all scenarios, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Scenario>> {
    return this.#http.invoke<Page<Scenario>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Scenario'
    )
  }

  /**
   * Get a scenario by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Scenario> {
    return this.#http.invoke<Scenario>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Scenario'
    )
  }
}
