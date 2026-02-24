/**
 * EQWindow client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { EQWindow, EQWindowCreateInput, EQWindowUpdateInput } from '../types.js';

/**
 * Client for the equalizer window.
 */
export class EQWindowResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all eqwindows.
   */
  async list(): Promise<EQWindow[]> {
    return this.#http.rpc<EQWindow[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a eqwindow by id.
   */
  async get(id: string): Promise<EQWindow> {
    return this.#http.rpc<EQWindow>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new eqwindow.
   */
  async create(input: EQWindowCreateInput): Promise<EQWindow> {
    return this.#http.rpc<EQWindow>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing eqwindow.
   */
  async update(id: string, input: EQWindowUpdateInput): Promise<EQWindow> {
    return this.#http.rpc<EQWindow>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a eqwindow.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
