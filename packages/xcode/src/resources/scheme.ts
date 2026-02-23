/**
 * Scheme client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Scheme, SchemeCreateInput, SchemeUpdateInput } from '../types.js';

/**
 * Client for a set of parameters for building, testing, launching or distributing the products of a workspace.
 */
export class SchemeResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all schemes.
   */
  async list(): Promise<Scheme[]> {
    return this.#http.rpc<Scheme[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scheme by id.
   */
  async get(id: string): Promise<Scheme> {
    return this.#http.rpc<Scheme>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scheme.
   */
  async create(input: SchemeCreateInput): Promise<Scheme> {
    return this.#http.rpc<Scheme>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scheme.
   */
  async update(id: string, input: SchemeUpdateInput): Promise<Scheme> {
    return this.#http.rpc<Scheme>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scheme.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
