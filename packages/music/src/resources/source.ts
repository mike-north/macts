/**
 * Source client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Source, SourceCreateInput, SourceUpdateInput } from '../types.js';

/**
 * Client for a media source (library, cd, device, etc.).
 */
export class SourceResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all sources.
   */
  async list(): Promise<Source[]> {
    return this.#http.rpc<Source[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a source by id.
   */
  async get(id: string): Promise<Source> {
    return this.#http.rpc<Source>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new source.
   */
  async create(input: SourceCreateInput): Promise<Source> {
    return this.#http.rpc<Source>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing source.
   */
  async update(id: string, input: SourceUpdateInput): Promise<Source> {
    return this.#http.rpc<Source>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a source.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
