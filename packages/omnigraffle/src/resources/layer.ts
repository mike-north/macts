/**
 * Layer client for OmniGraffle SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Layer, LayerCreateInput, LayerUpdateInput } from '../types.js';

/**
 * Client for a drawing layer in omnigraffle.
 */
export class LayerResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all layers.
   */
  async list(): Promise<Layer[]> {
    return this.#http.rpc<Layer[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a layer by name.
   */
  async get(name: string): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new layer.
   */
  async create(input: LayerCreateInput): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing layer.
   */
  async update(name: string, input: LayerUpdateInput): Promise<Layer> {
    return this.#http.rpc<Layer>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a layer.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name });
  }



}
