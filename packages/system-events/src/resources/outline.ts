/**
 * Outline client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Outline, OutlineCreateInput, OutlineUpdateInput } from '../types.js';

/**
 * Client for a outline belonging to a window.
 */
export class OutlineResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all outlines.
   */
  async list(): Promise<Outline[]> {
    return this.#http.rpc<Outline[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a outline by id.
   */
  async get(id: string): Promise<Outline> {
    return this.#http.rpc<Outline>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new outline.
   */
  async create(input: OutlineCreateInput): Promise<Outline> {
    return this.#http.rpc<Outline>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing outline.
   */
  async update(id: string, input: OutlineUpdateInput): Promise<Outline> {
    return this.#http.rpc<Outline>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a outline.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
