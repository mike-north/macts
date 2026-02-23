/**
 * Checkbox client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Checkbox, CheckboxCreateInput, CheckboxUpdateInput } from '../types.js';

/**
 * Client for a checkbox belonging to a window.
 */
export class CheckboxResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all checkboxes.
   */
  async list(): Promise<Checkbox[]> {
    return this.#http.rpc<Checkbox[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a checkbox by id.
   */
  async get(id: string): Promise<Checkbox> {
    return this.#http.rpc<Checkbox>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new checkbox.
   */
  async create(input: CheckboxCreateInput): Promise<Checkbox> {
    return this.#http.rpc<Checkbox>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing checkbox.
   */
  async update(id: string, input: CheckboxUpdateInput): Promise<Checkbox> {
    return this.#http.rpc<Checkbox>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a checkbox.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
