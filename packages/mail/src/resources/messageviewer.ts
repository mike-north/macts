/**
 * MessageViewer client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { MessageViewer, MessageViewerCreateInput, MessageViewerUpdateInput } from '../types.js'

/**
 * Client for represents the object responsible for managing a viewer window.
 */
export class MessageViewerResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all messageviewers.
   */
  async list(): Promise<MessageViewer[]> {
    return this.#http.rpc<MessageViewer[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a messageviewer by id.
   */
  async get(id: string): Promise<MessageViewer> {
    return this.#http.rpc<MessageViewer>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new messageviewer.
   */
  async create(input: MessageViewerCreateInput): Promise<MessageViewer> {
    return this.#http.rpc<MessageViewer>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing messageviewer.
   */
  async update(id: string, input: MessageViewerUpdateInput): Promise<MessageViewer> {
    return this.#http.rpc<MessageViewer>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a messageviewer.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
