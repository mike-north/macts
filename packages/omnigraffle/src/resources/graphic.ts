/**
 * Graphic client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Graphic, GraphicCreateInput, GraphicUpdateInput } from '../types.js';

/**
 * Client for base class for visual elements in omnigraffle.
 */
export class GraphicResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all graphics.
   */
  async list(): Promise<Graphic[]> {
    return this.#http.rpc<Graphic[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a graphic by id.
   */
  async get(id: string): Promise<Graphic> {
    return this.#http.rpc<Graphic>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new graphic.
   */
  async create(input: GraphicCreateInput): Promise<Graphic> {
    return this.#http.rpc<Graphic>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing graphic.
   */
  async update(id: string, input: GraphicUpdateInput): Promise<Graphic> {
    return this.#http.rpc<Graphic>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a graphic.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
