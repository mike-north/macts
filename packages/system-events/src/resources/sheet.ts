/**
 * Sheet client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Sheet, SheetCreateInput, SheetUpdateInput } from '../types.js';

/**
 * Client for a sheet displayed over a window.
 */
export class SheetResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all sheets.
   */
  async list(): Promise<Sheet[]> {
    return this.#http.rpc<Sheet[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a sheet by id.
   */
  async get(id: string): Promise<Sheet> {
    return this.#http.rpc<Sheet>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new sheet.
   */
  async create(input: SheetCreateInput): Promise<Sheet> {
    return this.#http.rpc<Sheet>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing sheet.
   */
  async update(id: string, input: SheetUpdateInput): Promise<Sheet> {
    return this.#http.rpc<Sheet>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a sheet.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
