/**
 * PageSetup client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { PageSetup, PageSetupCreateInput, PageSetupUpdateInput } from '../types.js';

/**
 * Client for page setup properties for a document or section.
 */
export class PageSetupResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all pagesetups.
   */
  async list(): Promise<PageSetup[]> {
    return this.#http.rpc<PageSetup[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a pagesetup by id.
   */
  async get(id: string): Promise<PageSetup> {
    return this.#http.rpc<PageSetup>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new pagesetup.
   */
  async create(input: PageSetupCreateInput): Promise<PageSetup> {
    return this.#http.rpc<PageSetup>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing pagesetup.
   */
  async update(id: string, input: PageSetupUpdateInput): Promise<PageSetup> {
    return this.#http.rpc<PageSetup>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a pagesetup.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
