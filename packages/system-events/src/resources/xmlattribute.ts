/**
 * XMLAttribute client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { XMLAttribute, XMLAttributeCreateInput, XMLAttributeUpdateInput } from '../types.js';

/**
 * Client for a named value associated with a unit of data in xml format.
 */
export class XMLAttributeResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all xmlattributes.
   */
  async list(): Promise<XMLAttribute[]> {
    return this.#http.rpc<XMLAttribute[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a xmlattribute by id.
   */
  async get(id: string): Promise<XMLAttribute> {
    return this.#http.rpc<XMLAttribute>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new xmlattribute.
   */
  async create(input: XMLAttributeCreateInput): Promise<XMLAttribute> {
    return this.#http.rpc<XMLAttribute>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing xmlattribute.
   */
  async update(id: string, input: XMLAttributeUpdateInput): Promise<XMLAttribute> {
    return this.#http.rpc<XMLAttribute>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a xmlattribute.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
