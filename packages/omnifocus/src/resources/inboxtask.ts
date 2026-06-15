/**
 * InboxTask client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { InboxTask, InboxTaskCreateInput } from '../types.js'

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
    return this.#http.rpc<InboxTask[]>(`${this.#app}.${this.#resource}.listInboxTasks`)
  }

  /**
   * Get a inboxtask by id.
   */
  async get(id: string): Promise<InboxTask> {
    return this.#http.rpc<InboxTask>(`${this.#app}.${this.#resource}.getInboxTask`, { id })
  }

  /**
   * Create a new inboxtask.
   */
  async create(input: InboxTaskCreateInput): Promise<InboxTask> {
    return this.#http.rpc<InboxTask>(`${this.#app}.${this.#resource}.createInboxTask`, input)
  }
}
