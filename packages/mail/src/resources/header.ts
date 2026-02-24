/**
 * Header client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Header, HeaderCreateInput, HeaderUpdateInput } from '../types.js';

/**
 * Client for a header value for a message. e.g. to, subject, from..
 */
export class HeaderResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all headers.
   */
  async list(): Promise<Header[]> {
    return this.#http.rpc<Header[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a header by id.
   */
  async get(id: string): Promise<Header> {
    return this.#http.rpc<Header>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new header.
   */
  async create(input: HeaderCreateInput): Promise<Header> {
    return this.#http.rpc<Header>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing header.
   */
  async update(id: string, input: HeaderUpdateInput): Promise<Header> {
    return this.#http.rpc<Header>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a header.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
