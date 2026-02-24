/**
 * ValueIndicator client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ValueIndicator, ValueIndicatorCreateInput, ValueIndicatorUpdateInput } from '../types.js';

/**
 * Client for a value indicator ( thumb or slider ) belonging to a scroll bar.
 */
export class ValueIndicatorResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all valueindicators.
   */
  async list(): Promise<ValueIndicator[]> {
    return this.#http.rpc<ValueIndicator[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a valueindicator by id.
   */
  async get(id: string): Promise<ValueIndicator> {
    return this.#http.rpc<ValueIndicator>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new valueindicator.
   */
  async create(input: ValueIndicatorCreateInput): Promise<ValueIndicator> {
    return this.#http.rpc<ValueIndicator>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing valueindicator.
   */
  async update(id: string, input: ValueIndicatorUpdateInput): Promise<ValueIndicator> {
    return this.#http.rpc<ValueIndicator>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a valueindicator.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
