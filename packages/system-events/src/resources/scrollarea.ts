/**
 * ScrollArea client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScrollArea, ScrollAreaCreateInput, ScrollAreaUpdateInput } from '../types.js';

/**
 * Client for a scroll area belonging to a window.
 */
export class ScrollAreaResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scrollareas.
   */
  async list(): Promise<ScrollArea[]> {
    return this.#http.rpc<ScrollArea[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scrollarea by id.
   */
  async get(id: string): Promise<ScrollArea> {
    return this.#http.rpc<ScrollArea>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scrollarea.
   */
  async create(input: ScrollAreaCreateInput): Promise<ScrollArea> {
    return this.#http.rpc<ScrollArea>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scrollarea.
   */
  async update(id: string, input: ScrollAreaUpdateInput): Promise<ScrollArea> {
    return this.#http.rpc<ScrollArea>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scrollarea.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
