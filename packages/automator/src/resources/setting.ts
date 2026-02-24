/**
 * Setting client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Setting, SettingCreateInput, SettingUpdateInput } from '../types.js';

/**
 * Client for a named value in an action.
 */
export class SettingResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all settings.
   */
  async list(): Promise<Setting[]> {
    return this.#http.rpc<Setting[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a setting by name.
   */
  async get(name: string): Promise<Setting> {
    return this.#http.rpc<Setting>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new setting.
   */
  async create(input: SettingCreateInput): Promise<Setting> {
    return this.#http.rpc<Setting>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing setting.
   */
  async update(name: string, input: SettingUpdateInput): Promise<Setting> {
    return this.#http.rpc<Setting>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a setting.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name });
  }


}
