/**
 * Task client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all tasks, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Task>> {
    return this.#http.invoke<Page<Task>>(`${this.#app}.${this.#resource}.list`, {}, __mactsOptions)
  }

  /**
   * Get a task by id.
   */
  async get(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Task> {
    return this.#http.invoke<Task>(`${this.#app}.${this.#resource}.get`, { id }, __mactsOptions)
  }

  /**
   * Create a new task.
   */
  async create(
    input: TaskCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Task> {
    return this.#http.invoke<Task>(`${this.#app}.${this.#resource}.create`, input, __mactsOptions)
  }
}
