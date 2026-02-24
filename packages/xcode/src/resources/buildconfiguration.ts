/**
 * BuildConfiguration client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { BuildConfiguration, BuildConfigurationCreateInput, BuildConfigurationUpdateInput } from '../types.js';

/**
 * Client for a set of build settings for a target or project. each target in a project has the same named build configurations as the project.
 */
export class BuildConfigurationResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all buildconfigurations.
   */
  async list(): Promise<BuildConfiguration[]> {
    return this.#http.rpc<BuildConfiguration[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a buildconfiguration by id.
   */
  async get(id: string): Promise<BuildConfiguration> {
    return this.#http.rpc<BuildConfiguration>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new buildconfiguration.
   */
  async create(input: BuildConfigurationCreateInput): Promise<BuildConfiguration> {
    return this.#http.rpc<BuildConfiguration>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing buildconfiguration.
   */
  async update(id: string, input: BuildConfigurationUpdateInput): Promise<BuildConfiguration> {
    return this.#http.rpc<BuildConfiguration>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a buildconfiguration.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
