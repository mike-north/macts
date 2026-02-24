/**
 * Interface client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Interface, InterfaceCreateInput, InterfaceUpdateInput } from '../types.js';

/**
 * Client for a collection of settings for a network interface.
 */
export class InterfaceResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all interfaces.
   */
  async list(): Promise<Interface[]> {
    return this.#http.rpc<Interface[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a interface by id.
   */
  async get(id: string): Promise<Interface> {
    return this.#http.rpc<Interface>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new interface.
   */
  async create(input: InterfaceCreateInput): Promise<Interface> {
    return this.#http.rpc<Interface>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing interface.
   */
  async update(id: string, input: InterfaceUpdateInput): Promise<Interface> {
    return this.#http.rpc<Interface>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a interface.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
