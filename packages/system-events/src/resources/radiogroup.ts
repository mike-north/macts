/**
 * RadioGroup client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { RadioGroup, RadioGroupCreateInput, RadioGroupUpdateInput } from '../types.js';

/**
 * Client for a radio button group belonging to a window.
 */
export class RadioGroupResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all radiogroups.
   */
  async list(): Promise<RadioGroup[]> {
    return this.#http.rpc<RadioGroup[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a radiogroup by id.
   */
  async get(id: string): Promise<RadioGroup> {
    return this.#http.rpc<RadioGroup>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new radiogroup.
   */
  async create(input: RadioGroupCreateInput): Promise<RadioGroup> {
    return this.#http.rpc<RadioGroup>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing radiogroup.
   */
  async update(id: string, input: RadioGroupUpdateInput): Promise<RadioGroup> {
    return this.#http.rpc<RadioGroup>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a radiogroup.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
