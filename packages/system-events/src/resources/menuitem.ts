/**
 * MenuItem client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { MenuItem, MenuItemCreateInput, MenuItemUpdateInput } from '../types.js';

/**
 * Client for a menu item belonging to a menu.
 */
export class MenuItemResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all menuitems.
   */
  async list(): Promise<MenuItem[]> {
    return this.#http.rpc<MenuItem[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a menuitem by id.
   */
  async get(id: string): Promise<MenuItem> {
    return this.#http.rpc<MenuItem>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new menuitem.
   */
  async create(input: MenuItemCreateInput): Promise<MenuItem> {
    return this.#http.rpc<MenuItem>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing menuitem.
   */
  async update(id: string, input: MenuItemUpdateInput): Promise<MenuItem> {
    return this.#http.rpc<MenuItem>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a menuitem.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
