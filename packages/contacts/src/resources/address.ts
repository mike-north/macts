/**
 * Address client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Address, AddressCreateInput, AddressUpdateInput } from '../types.js';

/**
 * Client for address for the given record..
 */
export class AddressResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all addresses.
   */
  async list(): Promise<Address[]> {
    return this.#http.rpc<Address[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a address by id.
   */
  async get(id: string): Promise<Address> {
    return this.#http.rpc<Address>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new address.
   */
  async create(input: AddressCreateInput): Promise<Address> {
    return this.#http.rpc<Address>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing address.
   */
  async update(id: string, input: AddressUpdateInput): Promise<Address> {
    return this.#http.rpc<Address>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a address.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
