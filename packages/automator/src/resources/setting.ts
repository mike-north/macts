/**
 * Setting client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Setting } from '../types.js'

/**
 * Client for a named value in an action.
 */
export class SettingResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the settings of one automator action, as one page.
   */
  async list(
    actionId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Setting>> {
    return this.#http.invoke<Page<Setting>>(
      `${this.#app}.${this.#resource}.list`,
      { actionId },
      __mactsOptions,
      'Setting'
    )
  }
}
