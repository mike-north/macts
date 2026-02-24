/**
 * Recipient client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Recipient, RecipientCreateInput, RecipientUpdateInput } from '../types.js';

/**
 * Client for an email recipient.
 */
export class RecipientResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all recipients.
   */
  async list(): Promise<Recipient[]> {
    return this.#http.rpc<Recipient[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a recipient by id.
   */
  async get(id: string): Promise<Recipient> {
    return this.#http.rpc<Recipient>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new recipient.
   */
  async create(input: RecipientCreateInput): Promise<Recipient> {
    return this.#http.rpc<Recipient>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing recipient.
   */
  async update(id: string, input: RecipientUpdateInput): Promise<Recipient> {
    return this.#http.rpc<Recipient>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a recipient.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
