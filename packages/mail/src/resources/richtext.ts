/**
 * RichText client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { RichText, RichTextCreateInput, RichTextUpdateInput } from '../types.js';

/**
 * Client for rich (styled) text.
 */
export class RichTextResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all richtext.
   */
  async list(): Promise<RichText[]> {
    return this.#http.rpc<RichText[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a richtext by id.
   */
  async get(id: string): Promise<RichText> {
    return this.#http.rpc<RichText>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new richtext.
   */
  async create(input: RichTextCreateInput): Promise<RichText> {
    return this.#http.rpc<RichText>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing richtext.
   */
  async update(id: string, input: RichTextUpdateInput): Promise<RichText> {
    return this.#http.rpc<RichText>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a richtext.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
