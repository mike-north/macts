/**
 * TextDocument client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { TextDocument, TextDocumentCreateInput, TextDocumentUpdateInput } from '../types.js';

/**
 * Client for a document that represents a text file on disk.
 */
export class TextDocumentResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all textdocuments.
   */
  async list(): Promise<TextDocument[]> {
    return this.#http.rpc<TextDocument[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a textdocument by name.
   */
  async get(name: string): Promise<TextDocument> {
    return this.#http.rpc<TextDocument>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new textdocument.
   */
  async create(input: TextDocumentCreateInput): Promise<TextDocument> {
    return this.#http.rpc<TextDocument>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing textdocument.
   */
  async update(name: string, input: TextDocumentUpdateInput): Promise<TextDocument> {
    return this.#http.rpc<TextDocument>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a textdocument.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name });
  }

}
