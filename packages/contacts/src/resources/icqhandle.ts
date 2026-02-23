/**
 * ICQHandle client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ICQHandle, ICQHandleCreateInput, ICQHandleUpdateInput } from '../types.js';

/**
 * Client for user name for icq instant messaging..
 */
export class ICQHandleResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all icqhandles.
   */
  async list(): Promise<ICQHandle[]> {
    return this.#http.rpc<ICQHandle[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a icqhandle by id.
   */
  async get(id: string): Promise<ICQHandle> {
    return this.#http.rpc<ICQHandle>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new icqhandle.
   */
  async create(input: ICQHandleCreateInput): Promise<ICQHandle> {
    return this.#http.rpc<ICQHandle>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing icqhandle.
   */
  async update(id: string, input: ICQHandleUpdateInput): Promise<ICQHandle> {
    return this.#http.rpc<ICQHandle>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a icqhandle.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
