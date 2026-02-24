/**
 * InboxTask client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { InboxTask, InboxTaskCreateInput, InboxTaskUpdateInput } from '../types.js'

/**
 * Client for a task that is in the document's inbox.
 */
export class InboxTaskResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all inboxtasks.
   */
  async list(): Promise<InboxTask[]> {
    return this.#http.rpc<InboxTask[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a inboxtask by id.
   */
  async get(id: string): Promise<InboxTask> {
    return this.#http.rpc<InboxTask>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new inboxtask.
   */
  async create(input: InboxTaskCreateInput): Promise<InboxTask> {
    return this.#http.rpc<InboxTask>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing inboxtask.
   */
  async update(id: string, input: InboxTaskUpdateInput): Promise<InboxTask> {
    return this.#http.rpc<InboxTask>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a inboxtask.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
