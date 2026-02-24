/**
 * Table client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Table, TableCreateInput, TableUpdateInput } from '../types.js';

/**
 * Client for a table in a document.
 */
export class TableResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all tables.
   */
  async list(): Promise<Table[]> {
    return this.#http.rpc<Table[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a table by id.
   */
  async get(id: string): Promise<Table> {
    return this.#http.rpc<Table>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new table.
   */
  async create(input: TableCreateInput): Promise<Table> {
    return this.#http.rpc<Table>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing table.
   */
  async update(id: string, input: TableUpdateInput): Promise<Table> {
    return this.#http.rpc<Table>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a table.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
