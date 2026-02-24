/**
 * Row client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Row, RowCreateInput, RowUpdateInput } from '../types.js';

/**
 * Client for a row belonging to a table.
 */
export class RowResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all rows.
   */
  async list(): Promise<Row[]> {
    return this.#http.rpc<Row[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a row by id.
   */
  async get(id: string): Promise<Row> {
    return this.#http.rpc<Row>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new row.
   */
  async create(input: RowCreateInput): Promise<Row> {
    return this.#http.rpc<Row>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing row.
   */
  async update(id: string, input: RowUpdateInput): Promise<Row> {
    return this.#http.rpc<Row>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a row.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
