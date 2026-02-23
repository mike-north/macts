/**
 * ToRecipient client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ToRecipient, ToRecipientCreateInput, ToRecipientUpdateInput } from '../types.js';

/**
 * Client for an email recipient in the to: field.
 */
export class ToRecipientResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all torecipients.
   */
  async list(): Promise<ToRecipient[]> {
    return this.#http.rpc<ToRecipient[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a torecipient by id.
   */
  async get(id: string): Promise<ToRecipient> {
    return this.#http.rpc<ToRecipient>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new torecipient.
   */
  async create(input: ToRecipientCreateInput): Promise<ToRecipient> {
    return this.#http.rpc<ToRecipient>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing torecipient.
   */
  async update(id: string, input: ToRecipientUpdateInput): Promise<ToRecipient> {
    return this.#http.rpc<ToRecipient>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a torecipient.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
