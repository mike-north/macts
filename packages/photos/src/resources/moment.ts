/**
 * Moment client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Moment, MomentCreateInput, MomentUpdateInput } from '../types.js';

/**
 * Client for a set of media items that represents a moment.
 */
export class MomentResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all moments.
   */
  async list(): Promise<Moment[]> {
    return this.#http.rpc<Moment[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a moment by id.
   */
  async get(id: string): Promise<Moment> {
    return this.#http.rpc<Moment>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new moment.
   */
  async create(input: MomentCreateInput): Promise<Moment> {
    return this.#http.rpc<Moment>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing moment.
   */
  async update(id: string, input: MomentUpdateInput): Promise<Moment> {
    return this.#http.rpc<Moment>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a moment.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
