/**
 * TextArea client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { TextArea, TextAreaCreateInput, TextAreaUpdateInput } from '../types.js';

/**
 * Client for a text area belonging to a window.
 */
export class TextAreaResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all textareas.
   */
  async list(): Promise<TextArea[]> {
    return this.#http.rpc<TextArea[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a textarea by id.
   */
  async get(id: string): Promise<TextArea> {
    return this.#http.rpc<TextArea>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new textarea.
   */
  async create(input: TextAreaCreateInput): Promise<TextArea> {
    return this.#http.rpc<TextArea>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing textarea.
   */
  async update(id: string, input: TextAreaUpdateInput): Promise<TextArea> {
    return this.#http.rpc<TextArea>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a textarea.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
