/**
 * Paragraph client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Paragraph, ParagraphCreateInput, ParagraphUpdateInput } from '../types.js';

/**
 * Client for a single paragraph in a document.
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
   * Get a paragraph by paragraphId.
   */
  async get(paragraphId: string): Promise<Paragraph> {
    return this.#http.rpc<Paragraph>(`${this.#app}.${this.#resource}.get`, { paragraphId });
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
  async update(paragraphId: string, input: ParagraphUpdateInput): Promise<Paragraph> {
    return this.#http.rpc<Paragraph>(`${this.#app}.${this.#resource}.update`, { paragraphId, ...input });
  }

  /**
   * Delete a paragraph.
   */
  async delete(paragraphId: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { paragraphId });
  }

}
