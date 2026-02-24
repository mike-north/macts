/**
 * File client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { File, FileCreateInput, FileUpdateInput } from '../types.js';

/**
 * Client for a file.
 */
export class FileResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all files.
   */
  async list(): Promise<File[]> {
    return this.#http.rpc<File[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a file by id.
   */
  async get(id: string): Promise<File> {
    return this.#http.rpc<File>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new file.
   */
  async create(input: FileCreateInput): Promise<File> {
    return this.#http.rpc<File>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing file.
   */
  async update(id: string, input: FileUpdateInput): Promise<File> {
    return this.#http.rpc<File>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a file.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
