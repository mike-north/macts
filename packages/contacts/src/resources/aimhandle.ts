/**
 * AIMHandle client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { AIMHandle, AIMHandleCreateInput, AIMHandleUpdateInput } from '../types.js';

/**
 * Client for user name for america online (aol) instant messaging..
 */
export class AIMHandleResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all aimhandles.
   */
  async list(): Promise<AIMHandle[]> {
    return this.#http.rpc<AIMHandle[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a aimhandle by id.
   */
  async get(id: string): Promise<AIMHandle> {
    return this.#http.rpc<AIMHandle>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new aimhandle.
   */
  async create(input: AIMHandleCreateInput): Promise<AIMHandle> {
    return this.#http.rpc<AIMHandle>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing aimhandle.
   */
  async update(id: string, input: AIMHandleUpdateInput): Promise<AIMHandle> {
    return this.#http.rpc<AIMHandle>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a aimhandle.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
