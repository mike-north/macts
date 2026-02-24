/**
 * Package client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Package, PackageCreateInput, PackageUpdateInput } from '../types.js';

/**
 * Client for a package.
 */
export class PackageResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all packages.
   */
  async list(): Promise<Package[]> {
    return this.#http.rpc<Package[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a package by id.
   */
  async get(id: string): Promise<Package> {
    return this.#http.rpc<Package>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new package.
   */
  async create(input: PackageCreateInput): Promise<Package> {
    return this.#http.rpc<Package>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing package.
   */
  async update(id: string, input: PackageUpdateInput): Promise<Package> {
    return this.#http.rpc<Package>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a package.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
