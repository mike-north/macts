/**
 * ColorWell client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ColorWell, ColorWellCreateInput, ColorWellUpdateInput } from '../types.js';

/**
 * Client for a color well belonging to a window.
 */
export class ColorWellResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all colorwells.
   */
  async list(): Promise<ColorWell[]> {
    return this.#http.rpc<ColorWell[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a colorwell by id.
   */
  async get(id: string): Promise<ColorWell> {
    return this.#http.rpc<ColorWell>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new colorwell.
   */
  async create(input: ColorWellCreateInput): Promise<ColorWell> {
    return this.#http.rpc<ColorWell>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing colorwell.
   */
  async update(id: string, input: ColorWellUpdateInput): Promise<ColorWell> {
    return this.#http.rpc<ColorWell>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a colorwell.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
