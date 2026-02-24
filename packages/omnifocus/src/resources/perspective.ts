/**
 * Perspective client for OmniFocus SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Perspective, PerspectiveCreateInput, PerspectiveUpdateInput } from '../types.js';

/**
 * Client for a saved view or filter configuration.
 */
export class PerspectiveResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all perspectives.
   */
  async list(): Promise<Perspective[]> {
    return this.#http.rpc<Perspective[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a perspective by id.
   */
  async get(id: string): Promise<Perspective> {
    return this.#http.rpc<Perspective>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new perspective.
   */
  async create(input: PerspectiveCreateInput): Promise<Perspective> {
    return this.#http.rpc<Perspective>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing perspective.
   */
  async update(id: string, input: PerspectiveUpdateInput): Promise<Perspective> {
    return this.#http.rpc<Perspective>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a perspective.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
