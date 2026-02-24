/**
 * FinderWindow client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { FinderWindow, FinderWindowCreateInput, FinderWindowUpdateInput } from '../types.js';

/**
 * Client for a file viewer window.
 */
export class FinderWindowResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all finderwindows.
   */
  async list(): Promise<FinderWindow[]> {
    return this.#http.rpc<FinderWindow[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a finderwindow by id.
   */
  async get(id: string): Promise<FinderWindow> {
    return this.#http.rpc<FinderWindow>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new finderwindow.
   */
  async create(input: FinderWindowCreateInput): Promise<FinderWindow> {
    return this.#http.rpc<FinderWindow>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing finderwindow.
   */
  async update(id: string, input: FinderWindowUpdateInput): Promise<FinderWindow> {
    return this.#http.rpc<FinderWindow>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a finderwindow.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
