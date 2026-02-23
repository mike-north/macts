/**
 * Email client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Email, EmailCreateInput, EmailUpdateInput } from '../types.js';

/**
 * Client for email address for a person..
 */
export class EmailResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all emails.
   */
  async list(): Promise<Email[]> {
    return this.#http.rpc<Email[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a email by id.
   */
  async get(id: string): Promise<Email> {
    return this.#http.rpc<Email>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new email.
   */
  async create(input: EmailCreateInput): Promise<Email> {
    return this.#http.rpc<Email>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing email.
   */
  async update(id: string, input: EmailUpdateInput): Promise<Email> {
    return this.#http.rpc<Email>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a email.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
