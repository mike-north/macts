/**
 * ResolvedBuildSetting client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ResolvedBuildSetting, ResolvedBuildSettingCreateInput, ResolvedBuildSettingUpdateInput } from '../types.js';

/**
 * Client for an object that represents a resolved value for a build setting.
 */
export class ResolvedBuildSettingResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all resolvedbuildsettings.
   */
  async list(): Promise<ResolvedBuildSetting[]> {
    return this.#http.rpc<ResolvedBuildSetting[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a resolvedbuildsetting by name.
   */
  async get(name: string): Promise<ResolvedBuildSetting> {
    return this.#http.rpc<ResolvedBuildSetting>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new resolvedbuildsetting.
   */
  async create(input: ResolvedBuildSettingCreateInput): Promise<ResolvedBuildSetting> {
    return this.#http.rpc<ResolvedBuildSetting>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing resolvedbuildsetting.
   */
  async update(name: string, input: ResolvedBuildSettingUpdateInput): Promise<ResolvedBuildSetting> {
    return this.#http.rpc<ResolvedBuildSetting>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a resolvedbuildsetting.
   */
  async delete(name: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { name });
  }

}
