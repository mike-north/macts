/**
 * ProgressIndicator client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ProgressIndicator, ProgressIndicatorCreateInput, ProgressIndicatorUpdateInput } from '../types.js';

/**
 * Client for a progress indicator belonging to a window.
 */
export class ProgressIndicatorResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all progressindicators.
   */
  async list(): Promise<ProgressIndicator[]> {
    return this.#http.rpc<ProgressIndicator[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a progressindicator by id.
   */
  async get(id: string): Promise<ProgressIndicator> {
    return this.#http.rpc<ProgressIndicator>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new progressindicator.
   */
  async create(input: ProgressIndicatorCreateInput): Promise<ProgressIndicator> {
    return this.#http.rpc<ProgressIndicator>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing progressindicator.
   */
  async update(id: string, input: ProgressIndicatorUpdateInput): Promise<ProgressIndicator> {
    return this.#http.rpc<ProgressIndicator>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a progressindicator.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
