/**
 * Alias client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Alias, AliasCreateInput, AliasUpdateInput } from '../types.js';

/**
 * Client for an alias in the file system.
 */
export class AliasResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all aliases.
   */
  async list(): Promise<Alias[]> {
    return this.#http.rpc<Alias[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a alias by id.
   */
  async get(id: string): Promise<Alias> {
    return this.#http.rpc<Alias>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new alias.
   */
  async create(input: AliasCreateInput): Promise<Alias> {
    return this.#http.rpc<Alias>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing alias.
   */
  async update(id: string, input: AliasUpdateInput): Promise<Alias> {
    return this.#http.rpc<Alias>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a alias.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
