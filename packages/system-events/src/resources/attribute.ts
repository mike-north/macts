/**
 * Attribute client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Attribute, AttributeCreateInput, AttributeUpdateInput } from '../types.js';

/**
 * Client for an named data value associated with the ui element.
 */
export class AttributeResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all attributes.
   */
  async list(): Promise<Attribute[]> {
    return this.#http.rpc<Attribute[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a attribute by id.
   */
  async get(id: string): Promise<Attribute> {
    return this.#http.rpc<Attribute>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new attribute.
   */
  async create(input: AttributeCreateInput): Promise<Attribute> {
    return this.#http.rpc<Attribute>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing attribute.
   */
  async update(id: string, input: AttributeUpdateInput): Promise<Attribute> {
    return this.#http.rpc<Attribute>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a attribute.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
