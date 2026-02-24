/**
 * PopOver client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { PopOver, PopOverCreateInput, PopOverUpdateInput } from '../types.js';

/**
 * Client for a pop over belonging to a window.
 */
export class PopOverResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all popovers.
   */
  async list(): Promise<PopOver[]> {
    return this.#http.rpc<PopOver[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a popover by id.
   */
  async get(id: string): Promise<PopOver> {
    return this.#http.rpc<PopOver>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new popover.
   */
  async create(input: PopOverCreateInput): Promise<PopOver> {
    return this.#http.rpc<PopOver>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing popover.
   */
  async update(id: string, input: PopOverUpdateInput): Promise<PopOver> {
    return this.#http.rpc<PopOver>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a popover.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
