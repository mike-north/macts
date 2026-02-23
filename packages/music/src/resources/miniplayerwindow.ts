/**
 * MiniplayerWindow client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { MiniplayerWindow, MiniplayerWindowCreateInput, MiniplayerWindowUpdateInput } from '../types.js';

/**
 * Client for the miniplayer window.
 */
export class MiniplayerWindowResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all miniplayerwindows.
   */
  async list(): Promise<MiniplayerWindow[]> {
    return this.#http.rpc<MiniplayerWindow[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a miniplayerwindow by id.
   */
  async get(id: string): Promise<MiniplayerWindow> {
    return this.#http.rpc<MiniplayerWindow>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new miniplayerwindow.
   */
  async create(input: MiniplayerWindowCreateInput): Promise<MiniplayerWindow> {
    return this.#http.rpc<MiniplayerWindow>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing miniplayerwindow.
   */
  async update(id: string, input: MiniplayerWindowUpdateInput): Promise<MiniplayerWindow> {
    return this.#http.rpc<MiniplayerWindow>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a miniplayerwindow.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
