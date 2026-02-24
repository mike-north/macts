/**
 * Line client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Line, LineCreateInput, LineUpdateInput } from '../types.js';

/**
 * Client for a line/connector in omnigraffle.
 */
export class LineResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all lines.
   */
  async list(): Promise<Line[]> {
    return this.#http.rpc<Line[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a line by id.
   */
  async get(id: string): Promise<Line> {
    return this.#http.rpc<Line>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new line.
   */
  async create(input: LineCreateInput): Promise<Line> {
    return this.#http.rpc<Line>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing line.
   */
  async update(id: string, input: LineUpdateInput): Promise<Line> {
    return this.#http.rpc<Line>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a line.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
