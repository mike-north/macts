/**
 * Task client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Task, TaskCreateInput, TaskUpdateInput } from '../types.js'

/**
 * Client for a task within an omniplan project.
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
   * List all tasks.
   */
  async list(): Promise<Task[]> {
    return this.#http.rpc<Task[]>(`${this.#app}.${this.#resource}.list`)
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

  /**
   * Update an existing task.
   */
  async update(id: string, input: TaskUpdateInput): Promise<Task> {
    return this.#http.rpc<Task>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a task.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
