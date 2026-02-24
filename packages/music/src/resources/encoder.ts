/**
 * Encoder client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Encoder, EncoderCreateInput, EncoderUpdateInput } from '../types.js';

/**
 * Client for converts a track to a specific file format.
 */
export class EncoderResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all encoders.
   */
  async list(): Promise<Encoder[]> {
    return this.#http.rpc<Encoder[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a encoder by id.
   */
  async get(id: string): Promise<Encoder> {
    return this.#http.rpc<Encoder>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new encoder.
   */
  async create(input: EncoderCreateInput): Promise<Encoder> {
    return this.#http.rpc<Encoder>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing encoder.
   */
  async update(id: string, input: EncoderUpdateInput): Promise<Encoder> {
    return this.#http.rpc<Encoder>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a encoder.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
