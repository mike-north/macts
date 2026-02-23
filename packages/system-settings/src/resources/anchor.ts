/**
 * Anchor client for System Settings SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Anchor, AnchorCreateInput, AnchorUpdateInput } from '../types.js';

/**
 * Client for an anchor within a settings pane..
 */
export class AnchorResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all anchors.
   */
  async list(): Promise<Anchor[]> {
    return this.#http.rpc<Anchor[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a anchor by id.
   */
  async get(id: string): Promise<Anchor> {
    return this.#http.rpc<Anchor>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new anchor.
   */
  async create(input: AnchorCreateInput): Promise<Anchor> {
    return this.#http.rpc<Anchor>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing anchor.
   */
  async update(id: string, input: AnchorUpdateInput): Promise<Anchor> {
    return this.#http.rpc<Anchor>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a anchor.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
