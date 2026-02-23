/**
 * RadioTunerPlaylist client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { RadioTunerPlaylist, RadioTunerPlaylistCreateInput, RadioTunerPlaylistUpdateInput } from '../types.js';

/**
 * Client for the radio tuner playlist.
 */
export class RadioTunerPlaylistResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all radiotunerplaylists.
   */
  async list(): Promise<RadioTunerPlaylist[]> {
    return this.#http.rpc<RadioTunerPlaylist[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a radiotunerplaylist by id.
   */
  async get(id: string): Promise<RadioTunerPlaylist> {
    return this.#http.rpc<RadioTunerPlaylist>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new radiotunerplaylist.
   */
  async create(input: RadioTunerPlaylistCreateInput): Promise<RadioTunerPlaylist> {
    return this.#http.rpc<RadioTunerPlaylist>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing radiotunerplaylist.
   */
  async update(id: string, input: RadioTunerPlaylistUpdateInput): Promise<RadioTunerPlaylist> {
    return this.#http.rpc<RadioTunerPlaylist>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a radiotunerplaylist.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
