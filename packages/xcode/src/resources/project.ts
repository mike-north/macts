/**
 * Project client for Xcode SDK.
 * Auto-generated - do not edit.
 */

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
   */
  async list(workspaceName: string): Promise<{ items: Project[] }> {
    return this.#http.rpc<{ items: Project[] }>(`${this.#app}.${this.#resource}.list`, {
      workspaceName,
    })
  }

  /**
   * Get a project by id.
   */
  async get(id: string): Promise<Project> {
    return this.#http.rpc<Project>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
