/**
 * Master client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Master, MasterCreateInput, MasterUpdateInput } from '../types.js';

/**
 * Client for a reusable template/master in omnigraffle.
 */
export class MasterResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all masters.
   */
  async list(): Promise<Master[]> {
    return this.#http.rpc<Master[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a master by id.
   */
  async get(id: string): Promise<Master> {
    return this.#http.rpc<Master>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new master.
   */
  async create(input: MasterCreateInput): Promise<Master> {
    return this.#http.rpc<Master>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing master.
   */
  async update(id: string, input: MasterUpdateInput): Promise<Master> {
    return this.#http.rpc<Master>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a master.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
