/**
 * ListViewOptions client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ListViewOptions, ListViewOptionsCreateInput, ListViewOptionsUpdateInput } from '../types.js';

/**
 * Client for the list view options.
 */
export class ListViewOptionsResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all listviewoptionss.
   */
  async list(): Promise<ListViewOptions[]> {
    return this.#http.rpc<ListViewOptions[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a listviewoptions by id.
   */
  async get(id: string): Promise<ListViewOptions> {
    return this.#http.rpc<ListViewOptions>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new listviewoptions.
   */
  async create(input: ListViewOptionsCreateInput): Promise<ListViewOptions> {
    return this.#http.rpc<ListViewOptions>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing listviewoptions.
   */
  async update(id: string, input: ListViewOptionsUpdateInput): Promise<ListViewOptions> {
    return this.#http.rpc<ListViewOptions>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a listviewoptions.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
