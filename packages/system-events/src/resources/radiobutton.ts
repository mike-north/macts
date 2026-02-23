/**
 * RadioButton client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { RadioButton, RadioButtonCreateInput, RadioButtonUpdateInput } from '../types.js';

/**
 * Client for a radio button belonging to a window.
 */
export class RadioButtonResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all radiobuttons.
   */
  async list(): Promise<RadioButton[]> {
    return this.#http.rpc<RadioButton[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a radiobutton by id.
   */
  async get(id: string): Promise<RadioButton> {
    return this.#http.rpc<RadioButton>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new radiobutton.
   */
  async create(input: RadioButtonCreateInput): Promise<RadioButton> {
    return this.#http.rpc<RadioButton>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing radiobutton.
   */
  async update(id: string, input: RadioButtonUpdateInput): Promise<RadioButton> {
    return this.#http.rpc<RadioButton>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a radiobutton.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
