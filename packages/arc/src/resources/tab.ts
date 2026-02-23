/**
 * Tab client for Arc SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Tab, TabCreateInput, TabUpdateInput } from '../types.js';

/**
 * Client for a window's tab.
 */
export class TabResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all tabs.
   */
  async list(): Promise<Tab[]> {
    return this.#http.rpc<Tab[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a tab by id.
   */
  async get(id: string): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new tab.
   */
  async create(input: TabCreateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing tab.
   */
  async update(id: string, input: TabUpdateInput): Promise<Tab> {
    return this.#http.rpc<Tab>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a tab.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
