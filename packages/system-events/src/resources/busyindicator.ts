/**
 * BusyIndicator client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { BusyIndicator, BusyIndicatorCreateInput, BusyIndicatorUpdateInput } from '../types.js';

/**
 * Client for a busy indicator belonging to a window.
 */
export class BusyIndicatorResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all busyindicators.
   */
  async list(): Promise<BusyIndicator[]> {
    return this.#http.rpc<BusyIndicator[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a busyindicator by id.
   */
  async get(id: string): Promise<BusyIndicator> {
    return this.#http.rpc<BusyIndicator>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new busyindicator.
   */
  async create(input: BusyIndicatorCreateInput): Promise<BusyIndicator> {
    return this.#http.rpc<BusyIndicator>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing busyindicator.
   */
  async update(id: string, input: BusyIndicatorUpdateInput): Promise<BusyIndicator> {
    return this.#http.rpc<BusyIndicator>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a busyindicator.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
