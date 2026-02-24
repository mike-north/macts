/**
 * PropertyListItem client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  PropertyListItem,
  PropertyListItemCreateInput,
  PropertyListItemUpdateInput,
} from '../types.js'

/**
 * Client for a unit of data in property list format.
 */
export class PropertyListItemResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all propertylistitems.
   */
  async list(): Promise<PropertyListItem[]> {
    return this.#http.rpc<PropertyListItem[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a propertylistitem by id.
   */
  async get(id: string): Promise<PropertyListItem> {
    return this.#http.rpc<PropertyListItem>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new propertylistitem.
   */
  async create(input: PropertyListItemCreateInput): Promise<PropertyListItem> {
    return this.#http.rpc<PropertyListItem>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing propertylistitem.
   */
  async update(id: string, input: PropertyListItemUpdateInput): Promise<PropertyListItem> {
    return this.#http.rpc<PropertyListItem>(`${this.#app}.${this.#resource}.update`, {
      id,
      ...input,
    })
  }

  /**
   * Delete a propertylistitem.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
