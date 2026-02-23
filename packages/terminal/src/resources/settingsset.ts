/**
 * SettingsSet client for Terminal SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { SettingsSet, SettingsSetCreateInput, SettingsSetUpdateInput } from '../types.js';

/**
 * Client for a terminal settings set (profile).
 */
export class SettingsSetResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all settingssets.
   */
  async list(): Promise<SettingsSet[]> {
    return this.#http.rpc<SettingsSet[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a settingsset by name.
   */
  async get(name: string): Promise<SettingsSet> {
    return this.#http.rpc<SettingsSet>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new settingsset.
   */
  async create(input: SettingsSetCreateInput): Promise<SettingsSet> {
    return this.#http.rpc<SettingsSet>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing settingsset.
   */
  async update(name: string, input: SettingsSetUpdateInput): Promise<SettingsSet> {
    return this.#http.rpc<SettingsSet>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a settingsset.
   */
  async delete(name: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { name });
  }


}
