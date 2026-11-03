/**
 * Task client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Task, TaskCreateInput } from '../types.js'

/**
 * Client for a task within omnifocus.
 */
export class TaskResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List tasks, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Task[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Task[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a task by id.
   */
  async get(id: string): Promise<Task> {
    return this.#http.rpc<Task>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new task.
   */
  async create(input: TaskCreateInput): Promise<Task> {
    return this.#http.rpc<Task>(`${this.#app}.${this.#resource}.create`, input)
  }
}
