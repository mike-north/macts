/**
 * Project client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Project, ProjectCreateInput } from '../types.js'

/**
 * Client for a project in omnifocus.
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
   * List all projects, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Project>> {
    return this.#http.invoke<Page<Project>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions
    )
  }

  /**
   * Get a project by id.
   */
  async get(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Project> {
    return this.#http.invoke<Project>(`${this.#app}.${this.#resource}.get`, { id }, __mactsOptions)
  }

  /**
   * Create a new project.
   */
  async create(
    input: ProjectCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Project> {
    return this.#http.invoke<Project>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions
    )
  }
}
