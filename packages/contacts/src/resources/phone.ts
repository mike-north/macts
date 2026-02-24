/**
 * Phone client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Phone, PhoneCreateInput, PhoneUpdateInput } from '../types.js';

/**
 * Client for phone number for a person..
 */
export class PhoneResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all phones.
   */
  async list(): Promise<Phone[]> {
    return this.#http.rpc<Phone[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a phone by id.
   */
  async get(id: string): Promise<Phone> {
    return this.#http.rpc<Phone>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new phone.
   */
  async create(input: PhoneCreateInput): Promise<Phone> {
    return this.#http.rpc<Phone>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing phone.
   */
  async update(id: string, input: PhoneUpdateInput): Promise<Phone> {
    return this.#http.rpc<Phone>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a phone.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
