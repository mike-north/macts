/**
 * YahooHandle client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { YahooHandle, YahooHandleCreateInput, YahooHandleUpdateInput } from '../types.js';

/**
 * Client for user name for yahoo instant messaging..
 */
export class YahooHandleResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all yahoohandles.
   */
  async list(): Promise<YahooHandle[]> {
    return this.#http.rpc<YahooHandle[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a yahoohandle by id.
   */
  async get(id: string): Promise<YahooHandle> {
    return this.#http.rpc<YahooHandle>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new yahoohandle.
   */
  async create(input: YahooHandleCreateInput): Promise<YahooHandle> {
    return this.#http.rpc<YahooHandle>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing yahoohandle.
   */
  async update(id: string, input: YahooHandleUpdateInput): Promise<YahooHandle> {
    return this.#http.rpc<YahooHandle>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a yahoohandle.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
