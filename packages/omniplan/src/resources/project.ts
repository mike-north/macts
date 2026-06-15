/**
 * Project client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Project } from '../types.js'

/**
 * Client for an omniplan project.
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
   * List all projects.
   */
  async list(): Promise<Project[]> {
    return this.#http.rpc<Project[]>(`${this.#app}.${this.#resource}.listProjects`)
  }

  /**
   * Get a project by id.
   */
  async get(id: string): Promise<Project> {
    return this.#http.rpc<Project>(`${this.#app}.${this.#resource}.getProject`, { id })
  }
}
