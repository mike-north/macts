/**
 * ApplicationFile client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ApplicationFile, ApplicationFileCreateInput, ApplicationFileUpdateInput } from '../types.js';

/**
 * Client for an application's file on disk.
 */
export class ApplicationFileResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all applicationfiles.
   */
  async list(): Promise<ApplicationFile[]> {
    return this.#http.rpc<ApplicationFile[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a applicationfile by id.
   */
  async get(id: string): Promise<ApplicationFile> {
    return this.#http.rpc<ApplicationFile>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new applicationfile.
   */
  async create(input: ApplicationFileCreateInput): Promise<ApplicationFile> {
    return this.#http.rpc<ApplicationFile>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing applicationfile.
   */
  async update(id: string, input: ApplicationFileUpdateInput): Promise<ApplicationFile> {
    return this.#http.rpc<ApplicationFile>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a applicationfile.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
