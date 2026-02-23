/**
 * ScrollBar client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScrollBar, ScrollBarCreateInput, ScrollBarUpdateInput } from '../types.js';

/**
 * Client for a scroll bar belonging to a window.
 */
export class ScrollBarResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scrollbars.
   */
  async list(): Promise<ScrollBar[]> {
    return this.#http.rpc<ScrollBar[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scrollbar by id.
   */
  async get(id: string): Promise<ScrollBar> {
    return this.#http.rpc<ScrollBar>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scrollbar.
   */
  async create(input: ScrollBarCreateInput): Promise<ScrollBar> {
    return this.#http.rpc<ScrollBar>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scrollbar.
   */
  async update(id: string, input: ScrollBarUpdateInput): Promise<ScrollBar> {
    return this.#http.rpc<ScrollBar>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scrollbar.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
