/**
 * Selection client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Selection, SelectionCreateInput, SelectionUpdateInput } from '../types.js';

/**
 * Client for the current selection in a document.
 */
export class SelectionResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all selections.
   */
  async list(): Promise<Selection[]> {
    return this.#http.rpc<Selection[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a selection by id.
   */
  async get(id: string): Promise<Selection> {
    return this.#http.rpc<Selection>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new selection.
   */
  async create(input: SelectionCreateInput): Promise<Selection> {
    return this.#http.rpc<Selection>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing selection.
   */
  async update(id: string, input: SelectionUpdateInput): Promise<Selection> {
    return this.#http.rpc<Selection>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a selection.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
