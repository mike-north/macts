/**
 * Grid client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Grid, GridCreateInput, GridUpdateInput } from '../types.js';

/**
 * Client for grid settings for a canvas.
 */
export class GridResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all grids.
   */
  async list(): Promise<Grid[]> {
    return this.#http.rpc<Grid[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a grid by id.
   */
  async get(id: string): Promise<Grid> {
    return this.#http.rpc<Grid>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new grid.
   */
  async create(input: GridCreateInput): Promise<Grid> {
    return this.#http.rpc<Grid>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing grid.
   */
  async update(id: string, input: GridUpdateInput): Promise<Grid> {
    return this.#http.rpc<Grid>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a grid.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
