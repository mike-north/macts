/**
 * Configuration client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Configuration, ConfigurationCreateInput, ConfigurationUpdateInput } from '../types.js';

/**
 * Client for a collection of settings for configuring a connection.
 */
export class ConfigurationResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all configurations.
   */
  async list(): Promise<Configuration[]> {
    return this.#http.rpc<Configuration[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a configuration by id.
   */
  async get(id: string): Promise<Configuration> {
    return this.#http.rpc<Configuration>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new configuration.
   */
  async create(input: ConfigurationCreateInput): Promise<Configuration> {
    return this.#http.rpc<Configuration>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing configuration.
   */
  async update(id: string, input: ConfigurationUpdateInput): Promise<Configuration> {
    return this.#http.rpc<Configuration>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a configuration.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
