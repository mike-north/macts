/**
 * StaticText client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { StaticText, StaticTextCreateInput, StaticTextUpdateInput } from '../types.js';

/**
 * Client for a static text field belonging to a window.
 */
export class StaticTextResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all statictexts.
   */
  async list(): Promise<StaticText[]> {
    return this.#http.rpc<StaticText[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a statictext by id.
   */
  async get(id: string): Promise<StaticText> {
    return this.#http.rpc<StaticText>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new statictext.
   */
  async create(input: StaticTextCreateInput): Promise<StaticText> {
    return this.#http.rpc<StaticText>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing statictext.
   */
  async update(id: string, input: StaticTextUpdateInput): Promise<StaticText> {
    return this.#http.rpc<StaticText>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a statictext.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
