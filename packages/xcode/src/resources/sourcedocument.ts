/**
 * SourceDocument client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { SourceDocument, SourceDocumentCreateInput, SourceDocumentUpdateInput } from '../types.js';

/**
 * Client for a document that represents a source file on disk.
 */
export class SourceDocumentResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all sourcedocuments.
   */
  async list(): Promise<SourceDocument[]> {
    return this.#http.rpc<SourceDocument[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a sourcedocument by name.
   */
  async get(name: string): Promise<SourceDocument> {
    return this.#http.rpc<SourceDocument>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new sourcedocument.
   */
  async create(input: SourceDocumentCreateInput): Promise<SourceDocument> {
    return this.#http.rpc<SourceDocument>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing sourcedocument.
   */
  async update(name: string, input: SourceDocumentUpdateInput): Promise<SourceDocument> {
    return this.#http.rpc<SourceDocument>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a sourcedocument.
   */
  async delete(name: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { name });
  }

}
