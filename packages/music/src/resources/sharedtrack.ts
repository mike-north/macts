/**
 * SharedTrack client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { SharedTrack, SharedTrackCreateInput, SharedTrackUpdateInput } from '../types.js';

/**
 * Client for a track residing in a shared library.
 */
export class SharedTrackResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all sharedtracks.
   */
  async list(): Promise<SharedTrack[]> {
    return this.#http.rpc<SharedTrack[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a sharedtrack by id.
   */
  async get(id: string): Promise<SharedTrack> {
    return this.#http.rpc<SharedTrack>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new sharedtrack.
   */
  async create(input: SharedTrackCreateInput): Promise<SharedTrack> {
    return this.#http.rpc<SharedTrack>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing sharedtrack.
   */
  async update(id: string, input: SharedTrackUpdateInput): Promise<SharedTrack> {
    return this.#http.rpc<SharedTrack>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a sharedtrack.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
