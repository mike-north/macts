/**
 * InboxTask client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all inbox tasks, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<InboxTask>> {
    return this.#http.invoke<Page<InboxTask>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'InboxTask'
    )
  }

  /**
   * Get a inbox task by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<InboxTask> {
    return this.#http.invoke<InboxTask>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'InboxTask'
    )
  }

  /**
   * Create a new inbox task.
   */
  async create(
    input: InboxTaskCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<InboxTask> {
    return this.#http.invoke<InboxTask>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'InboxTask'
    )
  }
}
