/**
 * Resource client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Resource, ResourceCreateInput } from '../types.js'

/**
 * Client for a resource (person, equipment, or material).
 */
export class ResourceResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all resources.
   */
  async list(): Promise<Resource[]> {
    return this.#http.rpc<Resource[]>(`${this.#app}.${this.#resource}.listResources`)
  }

  /**
   * Get a resource by id.
   */
  async get(id: string): Promise<Resource> {
    return this.#http.rpc<Resource>(`${this.#app}.${this.#resource}.getResource`, { id })
  }

  /**
   * Create a new resource.
   */
  async create(input: ResourceCreateInput): Promise<Resource> {
    return this.#http.rpc<Resource>(`${this.#app}.${this.#resource}.createResource`, input)
  }
}
