/**
 * ScriptingSuite client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  ScriptingSuite,
  ScriptingSuiteCreateInput,
  ScriptingSuiteUpdateInput,
} from '../types.js'

/**
 * Client for a suite within a scripting definition.
 */
export class ScriptingSuiteResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all scriptingsuites.
   */
  async list(): Promise<ScriptingSuite[]> {
    return this.#http.rpc<ScriptingSuite[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a scriptingsuite by id.
   */
  async get(id: string): Promise<ScriptingSuite> {
    return this.#http.rpc<ScriptingSuite>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new scriptingsuite.
   */
  async create(input: ScriptingSuiteCreateInput): Promise<ScriptingSuite> {
    return this.#http.rpc<ScriptingSuite>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing scriptingsuite.
   */
  async update(id: string, input: ScriptingSuiteUpdateInput): Promise<ScriptingSuite> {
    return this.#http.rpc<ScriptingSuite>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a scriptingsuite.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
