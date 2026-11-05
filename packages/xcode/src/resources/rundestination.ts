/**
 * RunDestination client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { RunDestination } from '../types.js'

/**
 * Client for an object which specifies parameters such as the device and architecture for which to perform a scheme action.
 */
export class RunDestinationResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the run destinations of one workspace document, as one page.
   * When several workspace documents share the same name, the first match in the app's order is used as the workspace document.
   */
  async list(
    workspaceName: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<RunDestination>> {
    return this.#http.invoke<Page<RunDestination>>(
      `${this.#app}.${this.#resource}.list`,
      { workspaceName },
      __mactsOptions,
      'RunDestination'
    )
  }

  /**
   * Get a run destination by name within a parent scope.
   * When several run destinations share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   * When several workspace documents share the same name, the first match in the app's order is used as the workspace document.
   */
  async get(
    workspaceName: string,
    name: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<RunDestination> {
    return this.#http.invoke<RunDestination>(
      `${this.#app}.${this.#resource}.get`,
      { workspaceName, name },
      __mactsOptions,
      'RunDestination'
    )
  }
}
