/**
 * Folder client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Folder } from '../types.js'

/**
 * Client for a folder in the file system.
 */
export class FolderResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * Get a folder by posixPath.
   */
  async get(
    posixPath: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Folder> {
    return this.#http.invoke<Folder>(
      `${this.#app}.${this.#resource}.get`,
      { posixPath },
      __mactsOptions,
      'Folder'
    )
  }
}
