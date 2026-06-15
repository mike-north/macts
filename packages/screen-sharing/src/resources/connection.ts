/**
 * Connection client for Screen Sharing SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Connection } from '../types.js'

/**
 * Client for a screen sharing connection.
 */
export class ConnectionResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all connections.
   */
  async list(): Promise<Connection[]> {
    return this.#http.rpc<Connection[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a connection by id.
   */
  async get(id: string): Promise<Connection> {
    return this.#http.rpc<Connection>(`${this.#app}.${this.#resource}.get`, { id })
  }
}
