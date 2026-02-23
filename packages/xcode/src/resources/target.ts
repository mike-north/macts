/**
 * Target client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Target, TargetCreateInput, TargetUpdateInput } from '../types.js';

/**
 * Client for a target is a blueprint for building a product. targets inherit build settings from their project if not overridden in the target.
 */
export class TargetResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all targets.
   */
  async list(): Promise<Target[]> {
    return this.#http.rpc<Target[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a target by id.
   */
  async get(id: string): Promise<Target> {
    return this.#http.rpc<Target>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new target.
   */
  async create(input: TargetCreateInput): Promise<Target> {
    return this.#http.rpc<Target>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing target.
   */
  async update(id: string, input: TargetUpdateInput): Promise<Target> {
    return this.#http.rpc<Target>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a target.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
