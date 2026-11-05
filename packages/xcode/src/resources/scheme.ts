/**
 * Scheme client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Scheme } from '../types.js'

/**
 * Client for a set of parameters for building, testing, launching or distributing the products of a workspace.
 */
export class SchemeResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the schemes of one workspace document, as one page.
   * When several workspace documents share the same name, the first match in the app's order is used as the workspace document.
   */
  async list(
    workspaceName: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Scheme>> {
    return this.#http.invoke<Page<Scheme>>(
      `${this.#app}.${this.#resource}.list`,
      { workspaceName },
      __mactsOptions
    )
  }

  /**
   * Get a scheme by id within a parent scope.
   * When several workspace documents share the same name, the first match in the app's order is used as the workspace document.
   */
  async get(
    workspaceName: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Scheme> {
    return this.#http.invoke<Scheme>(
      `${this.#app}.${this.#resource}.get`,
      { workspaceName, id },
      __mactsOptions
    )
  }
}
