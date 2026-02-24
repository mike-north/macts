/**
 * PopUpButton client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { PopUpButton, PopUpButtonCreateInput, PopUpButtonUpdateInput } from '../types.js';

/**
 * Client for a pop up button belonging to a window.
 */
export class PopUpButtonResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all popupbuttons.
   */
  async list(): Promise<PopUpButton[]> {
    return this.#http.rpc<PopUpButton[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a popupbutton by id.
   */
  async get(id: string): Promise<PopUpButton> {
    return this.#http.rpc<PopUpButton>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new popupbutton.
   */
  async create(input: PopUpButtonCreateInput): Promise<PopUpButton> {
    return this.#http.rpc<PopUpButton>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing popupbutton.
   */
  async update(id: string, input: PopUpButtonUpdateInput): Promise<PopUpButton> {
    return this.#http.rpc<PopUpButton>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a popupbutton.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
