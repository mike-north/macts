/**
 * JabberHandle client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { JabberHandle, JabberHandleCreateInput, JabberHandleUpdateInput } from '../types.js';

/**
 * Client for user name for jabber instant messaging..
 */
export class JabberHandleResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all jabberhandles.
   */
  async list(): Promise<JabberHandle[]> {
    return this.#http.rpc<JabberHandle[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a jabberhandle by id.
   */
  async get(id: string): Promise<JabberHandle> {
    return this.#http.rpc<JabberHandle>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new jabberhandle.
   */
  async create(input: JabberHandleCreateInput): Promise<JabberHandle> {
    return this.#http.rpc<JabberHandle>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing jabberhandle.
   */
  async update(id: string, input: JabberHandleUpdateInput): Promise<JabberHandle> {
    return this.#http.rpc<JabberHandle>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a jabberhandle.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
