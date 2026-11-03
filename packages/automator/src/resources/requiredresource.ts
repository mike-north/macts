/**
 * RequiredResource client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { RequiredResource } from '../types.js'

/**
 * Client for a resource required for proper operation of the action.
 */
export class RequiredResourceResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the required resources of one automator action, as one page.
   */
  async list(actionId: string): Promise<Page<RequiredResource>> {
    return this.#http.rpc<Page<RequiredResource>>(`${this.#app}.${this.#resource}.list`, {
      actionId,
    })
  }
}
