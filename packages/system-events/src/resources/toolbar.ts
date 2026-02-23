/**
 * Toolbar client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Toolbar, ToolbarCreateInput, ToolbarUpdateInput } from '../types.js';

/**
 * Client for a toolbar belonging to a window.
 */
export class ToolbarResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all toolbars.
   */
  async list(): Promise<Toolbar[]> {
    return this.#http.rpc<Toolbar[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a toolbar by id.
   */
  async get(id: string): Promise<Toolbar> {
    return this.#http.rpc<Toolbar>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new toolbar.
   */
  async create(input: ToolbarCreateInput): Promise<Toolbar> {
    return this.#http.rpc<Toolbar>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing toolbar.
   */
  async update(id: string, input: ToolbarUpdateInput): Promise<Toolbar> {
    return this.#http.rpc<Toolbar>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a toolbar.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
