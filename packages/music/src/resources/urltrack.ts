/**
 * URLTrack client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { URLTrack, URLTrackCreateInput, URLTrackUpdateInput } from '../types.js';

/**
 * Client for a track representing a network stream.
 */
export class URLTrackResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all urltracks.
   */
  async list(): Promise<URLTrack[]> {
    return this.#http.rpc<URLTrack[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a urltrack by id.
   */
  async get(id: string): Promise<URLTrack> {
    return this.#http.rpc<URLTrack>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new urltrack.
   */
  async create(input: URLTrackCreateInput): Promise<URLTrack> {
    return this.#http.rpc<URLTrack>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing urltrack.
   */
  async update(id: string, input: URLTrackUpdateInput): Promise<URLTrack> {
    return this.#http.rpc<URLTrack>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a urltrack.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
