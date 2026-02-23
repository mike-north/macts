/**
 * NetworkPreferencesObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { NetworkPreferencesObject, NetworkPreferencesObjectCreateInput, NetworkPreferencesObjectUpdateInput } from '../types.js';

/**
 * Client for the preferences for the current user's network.
 */
export class NetworkPreferencesObjectResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all networkpreferencesobjects.
   */
  async list(): Promise<NetworkPreferencesObject[]> {
    return this.#http.rpc<NetworkPreferencesObject[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a networkpreferencesobject by id.
   */
  async get(id: string): Promise<NetworkPreferencesObject> {
    return this.#http.rpc<NetworkPreferencesObject>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new networkpreferencesobject.
   */
  async create(input: NetworkPreferencesObjectCreateInput): Promise<NetworkPreferencesObject> {
    return this.#http.rpc<NetworkPreferencesObject>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing networkpreferencesobject.
   */
  async update(id: string, input: NetworkPreferencesObjectUpdateInput): Promise<NetworkPreferencesObject> {
    return this.#http.rpc<NetworkPreferencesObject>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a networkpreferencesobject.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
