/**
 * BuildSetting client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { BuildSetting, BuildSettingCreateInput, BuildSettingUpdateInput } from '../types.js';

/**
 * Client for a setting that controls how products are built.
 */
export class BuildSettingResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all buildsettings.
   */
  async list(): Promise<BuildSetting[]> {
    return this.#http.rpc<BuildSetting[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a buildsetting by name.
   */
  async get(name: string): Promise<BuildSetting> {
    return this.#http.rpc<BuildSetting>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new buildsetting.
   */
  async create(input: BuildSettingCreateInput): Promise<BuildSetting> {
    return this.#http.rpc<BuildSetting>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing buildsetting.
   */
  async update(name: string, input: BuildSettingUpdateInput): Promise<BuildSetting> {
    return this.#http.rpc<BuildSetting>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a buildsetting.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name });
  }

}
