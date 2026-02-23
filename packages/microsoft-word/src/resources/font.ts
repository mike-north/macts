/**
 * Font client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Font, FontCreateInput, FontUpdateInput } from '../types.js';

/**
 * Client for font formatting properties.
 */
export class FontResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all fonts.
   */
  async list(): Promise<Font[]> {
    return this.#http.rpc<Font[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a font by id.
   */
  async get(id: string): Promise<Font> {
    return this.#http.rpc<Font>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new font.
   */
  async create(input: FontCreateInput): Promise<Font> {
    return this.#http.rpc<Font>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing font.
   */
  async update(id: string, input: FontUpdateInput): Promise<Font> {
    return this.#http.rpc<Font>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a font.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
