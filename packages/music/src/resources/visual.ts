/**
 * Visual client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Visual, VisualCreateInput, VisualUpdateInput } from '../types.js';

/**
 * Client for a visual plug-in.
 */
export class VisualResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all visuals.
   */
  async list(): Promise<Visual[]> {
    return this.#http.rpc<Visual[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a visual by id.
   */
  async get(id: string): Promise<Visual> {
    return this.#http.rpc<Visual>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new visual.
   */
  async create(input: VisualCreateInput): Promise<Visual> {
    return this.#http.rpc<Visual>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing visual.
   */
  async update(id: string, input: VisualUpdateInput): Promise<Visual> {
    return this.#http.rpc<Visual>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a visual.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
