/**
 * Slider client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Slider, SliderCreateInput, SliderUpdateInput } from '../types.js';

/**
 * Client for a slider belonging to a window.
 */
export class SliderResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all sliders.
   */
  async list(): Promise<Slider[]> {
    return this.#http.rpc<Slider[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a slider by id.
   */
  async get(id: string): Promise<Slider> {
    return this.#http.rpc<Slider>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new slider.
   */
  async create(input: SliderCreateInput): Promise<Slider> {
    return this.#http.rpc<Slider>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing slider.
   */
  async update(id: string, input: SliderUpdateInput): Promise<Slider> {
    return this.#http.rpc<Slider>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a slider.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
