/**
 * BrowserWindow client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { BrowserWindow, BrowserWindowCreateInput, BrowserWindowUpdateInput } from '../types.js';

/**
 * Client for the main window.
 */
export class BrowserWindowResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all browserwindows.
   */
  async list(): Promise<BrowserWindow[]> {
    return this.#http.rpc<BrowserWindow[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a browserwindow by id.
   */
  async get(id: string): Promise<BrowserWindow> {
    return this.#http.rpc<BrowserWindow>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new browserwindow.
   */
  async create(input: BrowserWindowCreateInput): Promise<BrowserWindow> {
    return this.#http.rpc<BrowserWindow>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing browserwindow.
   */
  async update(id: string, input: BrowserWindowUpdateInput): Promise<BrowserWindow> {
    return this.#http.rpc<BrowserWindow>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a browserwindow.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
