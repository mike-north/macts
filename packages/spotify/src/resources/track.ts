/**
 * Track client for Spotify SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Track, TrackCreateInput, TrackUpdateInput } from '../types.js';

/**
 * Client for the currently playing track.
 */
export class TrackResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all tracks.
   */
  async list(): Promise<Track[]> {
    return this.#http.rpc<Track[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a track by id.
   */
  async get(id: string): Promise<Track> {
    return this.#http.rpc<Track>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new track.
   */
  async create(input: TrackCreateInput): Promise<Track> {
    return this.#http.rpc<Track>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing track.
   */
  async update(id: string, input: TrackUpdateInput): Promise<Track> {
    return this.#http.rpc<Track>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a track.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
