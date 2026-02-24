/**
 * SchemeActionResult client for Xcode SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { SchemeActionResult, SchemeActionResultCreateInput, SchemeActionResultUpdateInput } from '../types.js';

/**
 * Client for an object describing the result of performing a scheme action command.
 */
export class SchemeActionResultResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all schemeactionresults.
   */
  async list(): Promise<SchemeActionResult[]> {
    return this.#http.rpc<SchemeActionResult[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a schemeactionresult by id.
   */
  async get(id: string): Promise<SchemeActionResult> {
    return this.#http.rpc<SchemeActionResult>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new schemeactionresult.
   */
  async create(input: SchemeActionResultCreateInput): Promise<SchemeActionResult> {
    return this.#http.rpc<SchemeActionResult>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing schemeactionresult.
   */
  async update(id: string, input: SchemeActionResultUpdateInput): Promise<SchemeActionResult> {
    return this.#http.rpc<SchemeActionResult>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a schemeactionresult.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
