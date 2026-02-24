/**
 * ScriptingProperty client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  ScriptingProperty,
  ScriptingPropertyCreateInput,
  ScriptingPropertyUpdateInput,
} from '../types.js'

/**
 * Client for a property within a class within a suite within a scripting definition.
 */
export class ScriptingPropertyResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all scriptingproperties.
   */
  async list(): Promise<ScriptingProperty[]> {
    return this.#http.rpc<ScriptingProperty[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a scriptingproperty by id.
   */
  async get(id: string): Promise<ScriptingProperty> {
    return this.#http.rpc<ScriptingProperty>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new scriptingproperty.
   */
  async create(input: ScriptingPropertyCreateInput): Promise<ScriptingProperty> {
    return this.#http.rpc<ScriptingProperty>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing scriptingproperty.
   */
  async update(id: string, input: ScriptingPropertyUpdateInput): Promise<ScriptingProperty> {
    return this.#http.rpc<ScriptingProperty>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a scriptingproperty.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
