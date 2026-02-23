/**
 * Browser client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Browser, BrowserCreateInput, BrowserUpdateInput } from '../types.js';

/**
 * Client for a browser belonging to a window.
 */
export class BrowserResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all browsers.
   */
  async list(): Promise<Browser[]> {
    return this.#http.rpc<Browser[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a browser by id.
   */
  async get(id: string): Promise<Browser> {
    return this.#http.rpc<Browser>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new browser.
   */
  async create(input: BrowserCreateInput): Promise<Browser> {
    return this.#http.rpc<Browser>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing browser.
   */
  async update(id: string, input: BrowserUpdateInput): Promise<Browser> {
    return this.#http.rpc<Browser>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a browser.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
