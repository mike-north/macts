/**
 * Splitter client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Splitter, SplitterCreateInput, SplitterUpdateInput } from '../types.js';

/**
 * Client for a splitter belonging to a window.
 */
export class SplitterResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all splitters.
   */
  async list(): Promise<Splitter[]> {
    return this.#http.rpc<Splitter[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a splitter by id.
   */
  async get(id: string): Promise<Splitter> {
    return this.#http.rpc<Splitter>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new splitter.
   */
  async create(input: SplitterCreateInput): Promise<Splitter> {
    return this.#http.rpc<Splitter>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing splitter.
   */
  async update(id: string, input: SplitterUpdateInput): Promise<Splitter> {
    return this.#http.rpc<Splitter>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a splitter.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
