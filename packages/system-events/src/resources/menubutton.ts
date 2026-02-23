/**
 * MenuButton client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { MenuButton, MenuButtonCreateInput, MenuButtonUpdateInput } from '../types.js';

/**
 * Client for a menu button belonging to a window.
 */
export class MenuButtonResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all menubuttons.
   */
  async list(): Promise<MenuButton[]> {
    return this.#http.rpc<MenuButton[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a menubutton by id.
   */
  async get(id: string): Promise<MenuButton> {
    return this.#http.rpc<MenuButton>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new menubutton.
   */
  async create(input: MenuButtonCreateInput): Promise<MenuButton> {
    return this.#http.rpc<MenuButton>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing menubutton.
   */
  async update(id: string, input: MenuButtonUpdateInput): Promise<MenuButton> {
    return this.#http.rpc<MenuButton>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a menubutton.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
