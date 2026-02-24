/**
 * RelevanceIndicator client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { RelevanceIndicator, RelevanceIndicatorCreateInput, RelevanceIndicatorUpdateInput } from '../types.js';

/**
 * Client for a relevance indicator belonging to a window.
 */
export class RelevanceIndicatorResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all relevanceindicators.
   */
  async list(): Promise<RelevanceIndicator[]> {
    return this.#http.rpc<RelevanceIndicator[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a relevanceindicator by id.
   */
  async get(id: string): Promise<RelevanceIndicator> {
    return this.#http.rpc<RelevanceIndicator>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new relevanceindicator.
   */
  async create(input: RelevanceIndicatorCreateInput): Promise<RelevanceIndicator> {
    return this.#http.rpc<RelevanceIndicator>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing relevanceindicator.
   */
  async update(id: string, input: RelevanceIndicatorUpdateInput): Promise<RelevanceIndicator> {
    return this.#http.rpc<RelevanceIndicator>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a relevanceindicator.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
