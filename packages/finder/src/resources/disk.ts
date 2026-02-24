/**
 * Disk client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Disk, DiskCreateInput, DiskUpdateInput } from '../types.js';

/**
 * Client for a disk.
 */
export class DiskResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all disks.
   */
  async list(): Promise<Disk[]> {
    return this.#http.rpc<Disk[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a disk by id.
   */
  async get(id: string): Promise<Disk> {
    return this.#http.rpc<Disk>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new disk.
   */
  async create(input: DiskCreateInput): Promise<Disk> {
    return this.#http.rpc<Disk>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing disk.
   */
  async update(id: string, input: DiskUpdateInput): Promise<Disk> {
    return this.#http.rpc<Disk>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a disk.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
