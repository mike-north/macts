/**
 * FilePackage client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { FilePackage, FilePackageCreateInput, FilePackageUpdateInput } from '../types.js';

/**
 * Client for a file package in the file system.
 */
export class FilePackageResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all filepackages.
   */
  async list(): Promise<FilePackage[]> {
    return this.#http.rpc<FilePackage[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a filepackage by id.
   */
  async get(id: string): Promise<FilePackage> {
    return this.#http.rpc<FilePackage>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new filepackage.
   */
  async create(input: FilePackageCreateInput): Promise<FilePackage> {
    return this.#http.rpc<FilePackage>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing filepackage.
   */
  async update(id: string, input: FilePackageUpdateInput): Promise<FilePackage> {
    return this.#http.rpc<FilePackage>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a filepackage.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
