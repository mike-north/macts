/**
 * Space client for Arc SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Space, SpaceCreateInput, SpaceUpdateInput } from '../types.js';

/**
 * Client for a space.
 */
export class SpaceResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all spaces.
   */
  async list(): Promise<Space[]> {
    return this.#http.rpc<Space[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a space by id.
   */
  async get(id: string): Promise<Space> {
    return this.#http.rpc<Space>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new space.
   */
  async create(input: SpaceCreateInput): Promise<Space> {
    return this.#http.rpc<Space>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing space.
   */
  async update(id: string, input: SpaceUpdateInput): Promise<Space> {
    return this.#http.rpc<Space>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a space.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
