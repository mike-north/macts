/**
 * TabGroup client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { TabGroup, TabGroupCreateInput, TabGroupUpdateInput } from '../types.js';

/**
 * Client for a tab group belonging to a window.
 */
export class TabGroupResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all tabgroups.
   */
  async list(): Promise<TabGroup[]> {
    return this.#http.rpc<TabGroup[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a tabgroup by id.
   */
  async get(id: string): Promise<TabGroup> {
    return this.#http.rpc<TabGroup>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new tabgroup.
   */
  async create(input: TabGroupCreateInput): Promise<TabGroup> {
    return this.#http.rpc<TabGroup>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing tabgroup.
   */
  async update(id: string, input: TabGroupUpdateInput): Promise<TabGroup> {
    return this.#http.rpc<TabGroup>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a tabgroup.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
