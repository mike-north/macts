/**
 * MenuBarItem client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { MenuBarItem, MenuBarItemCreateInput, MenuBarItemUpdateInput } from '../types.js';

/**
 * Client for a menu bar item belonging to a menu bar.
 */
export class MenuBarItemResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all menubaritems.
   */
  async list(): Promise<MenuBarItem[]> {
    return this.#http.rpc<MenuBarItem[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a menubaritem by id.
   */
  async get(id: string): Promise<MenuBarItem> {
    return this.#http.rpc<MenuBarItem>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new menubaritem.
   */
  async create(input: MenuBarItemCreateInput): Promise<MenuBarItem> {
    return this.#http.rpc<MenuBarItem>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing menubaritem.
   */
  async update(id: string, input: MenuBarItemUpdateInput): Promise<MenuBarItem> {
    return this.#http.rpc<MenuBarItem>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a menubaritem.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
