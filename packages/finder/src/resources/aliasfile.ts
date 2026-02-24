/**
 * AliasFile client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { AliasFile, AliasFileCreateInput, AliasFileUpdateInput } from '../types.js';

/**
 * Client for an alias file (created with “make alias”).
 */
export class AliasFileResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all aliasfiles.
   */
  async list(): Promise<AliasFile[]> {
    return this.#http.rpc<AliasFile[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a aliasfile by id.
   */
  async get(id: string): Promise<AliasFile> {
    return this.#http.rpc<AliasFile>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new aliasfile.
   */
  async create(input: AliasFileCreateInput): Promise<AliasFile> {
    return this.#http.rpc<AliasFile>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing aliasfile.
   */
  async update(id: string, input: AliasFileUpdateInput): Promise<AliasFile> {
    return this.#http.rpc<AliasFile>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a aliasfile.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
