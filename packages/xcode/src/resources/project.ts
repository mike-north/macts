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
   * List the projects of one workspace document, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    workspaceName: string,
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<Page<Project>> {
    return this.#http.rpc<Page<Project>>(`${this.#app}.${this.#resource}.list`, {
      ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
      ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
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
