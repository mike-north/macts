/**
 * Menu client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Menu, MenuCreateInput, MenuUpdateInput } from '../types.js';

/**
 * Client for a menu belonging to a menu bar item.
 */
export class MenuResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all menus.
   */
  async list(): Promise<Menu[]> {
    return this.#http.rpc<Menu[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a menu by id.
   */
  async get(id: string): Promise<Menu> {
    return this.#http.rpc<Menu>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new menu.
   */
  async create(input: MenuCreateInput): Promise<Menu> {
    return this.#http.rpc<Menu>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing menu.
   */
  async update(id: string, input: MenuUpdateInput): Promise<Menu> {
    return this.#http.rpc<Menu>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a menu.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
