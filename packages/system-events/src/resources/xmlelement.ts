/**
 * XMLElement client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { XMLElement, XMLElementCreateInput, XMLElementUpdateInput } from '../types.js';

/**
 * Client for a unit of data in xml format.
 */
export class XMLElementResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all xmlelements.
   */
  async list(): Promise<XMLElement[]> {
    return this.#http.rpc<XMLElement[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a xmlelement by id.
   */
  async get(id: string): Promise<XMLElement> {
    return this.#http.rpc<XMLElement>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new xmlelement.
   */
  async create(input: XMLElementCreateInput): Promise<XMLElement> {
    return this.#http.rpc<XMLElement>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing xmlelement.
   */
  async update(id: string, input: XMLElementUpdateInput): Promise<XMLElement> {
    return this.#http.rpc<XMLElement>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a xmlelement.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
