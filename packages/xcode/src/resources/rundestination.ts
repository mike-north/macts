/**
 * RunDestination client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { RunDestination, RunDestinationCreateInput, RunDestinationUpdateInput } from '../types.js';

/**
 * Client for an object which specifies parameters such as the device and architecture for which to perform a scheme action.
 */
export class RunDestinationResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all rundestinations.
   */
  async list(): Promise<RunDestination[]> {
    return this.#http.rpc<RunDestination[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a rundestination by name.
   */
  async get(name: string): Promise<RunDestination> {
    return this.#http.rpc<RunDestination>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new rundestination.
   */
  async create(input: RunDestinationCreateInput): Promise<RunDestination> {
    return this.#http.rpc<RunDestination>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing rundestination.
   */
  async update(name: string, input: RunDestinationUpdateInput): Promise<RunDestination> {
    return this.#http.rpc<RunDestination>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a rundestination.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name });
  }


}
