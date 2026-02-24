/**
 * Paragraph client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Paragraph, ParagraphCreateInput, ParagraphUpdateInput } from '../types.js';

/**
 * Client for this subdivides the text into paragraphs..
 */
export class ParagraphResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all paragraphs.
   */
  async list(): Promise<Paragraph[]> {
    return this.#http.rpc<Paragraph[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a paragraph by id.
   */
  async get(id: string): Promise<Paragraph> {
    return this.#http.rpc<Paragraph>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new paragraph.
   */
  async create(input: ParagraphCreateInput): Promise<Paragraph> {
    return this.#http.rpc<Paragraph>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing paragraph.
   */
  async update(id: string, input: ParagraphUpdateInput): Promise<Paragraph> {
    return this.#http.rpc<Paragraph>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a paragraph.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
