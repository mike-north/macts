/**
 * Project client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Project } from '../types.js'

/**
 * Client for an xcode project. projects represent project files on disk and are always open in the context of a workspace document.
 */
export class ProjectResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the projects of one workspace document, as one page.
   * When several workspace documents share the same name, the first match in the app's order is used as the workspace document.
   */
  async list(
    workspaceName: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Project>> {
    return this.#http.invoke<Page<Project>>(
      `${this.#app}.${this.#resource}.list`,
      { workspaceName },
      __mactsOptions,
      'Project'
    )
  }

  /**
   * Get a project by id within a parent scope.
   * When several workspace documents share the same name, the first match in the app's order is used as the workspace document.
   */
  async get(
    workspaceName: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Project> {
    return this.#http.invoke<Project>(
      `${this.#app}.${this.#resource}.get`,
      { workspaceName, id },
      __mactsOptions,
      'Project'
    )
  }
}
