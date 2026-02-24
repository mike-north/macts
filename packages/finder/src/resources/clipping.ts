/**
 * Clipping client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Clipping, ClippingCreateInput, ClippingUpdateInput } from '../types.js';

/**
 * Client for a clipping.
 */
export class ClippingResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all clippings.
   */
  async list(): Promise<Clipping[]> {
    return this.#http.rpc<Clipping[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a clipping by id.
   */
  async get(id: string): Promise<Clipping> {
    return this.#http.rpc<Clipping>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new clipping.
   */
  async create(input: ClippingCreateInput): Promise<Clipping> {
    return this.#http.rpc<Clipping>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing clipping.
   */
  async update(id: string, input: ClippingUpdateInput): Promise<Clipping> {
    return this.#http.rpc<Clipping>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a clipping.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
