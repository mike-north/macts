/**
 * Label client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Label, LabelCreateInput, LabelUpdateInput } from '../types.js';

/**
 * Client for a text label on a line.
 */
export class LabelResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all labels.
   */
  async list(): Promise<Label[]> {
    return this.#http.rpc<Label[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a label by id.
   */
  async get(id: string): Promise<Label> {
    return this.#http.rpc<Label>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new label.
   */
  async create(input: LabelCreateInput): Promise<Label> {
    return this.#http.rpc<Label>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing label.
   */
  async update(id: string, input: LabelUpdateInput): Promise<Label> {
    return this.#http.rpc<Label>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a label.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
