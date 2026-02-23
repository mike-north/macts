/**
 * SplitterGroup client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { SplitterGroup, SplitterGroupCreateInput, SplitterGroupUpdateInput } from '../types.js';

/**
 * Client for a splitter group belonging to a window.
 */
export class SplitterGroupResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all splittergroups.
   */
  async list(): Promise<SplitterGroup[]> {
    return this.#http.rpc<SplitterGroup[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a splittergroup by id.
   */
  async get(id: string): Promise<SplitterGroup> {
    return this.#http.rpc<SplitterGroup>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new splittergroup.
   */
  async create(input: SplitterGroupCreateInput): Promise<SplitterGroup> {
    return this.#http.rpc<SplitterGroup>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing splittergroup.
   */
  async update(id: string, input: SplitterGroupUpdateInput): Promise<SplitterGroup> {
    return this.#http.rpc<SplitterGroup>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a splittergroup.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
