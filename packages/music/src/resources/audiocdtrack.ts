/**
 * AudioCDTrack client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { AudioCDTrack, AudioCDTrackCreateInput, AudioCDTrackUpdateInput } from '../types.js';

/**
 * Client for a track on an audio cd.
 */
export class AudioCDTrackResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all audiocdtracks.
   */
  async list(): Promise<AudioCDTrack[]> {
    return this.#http.rpc<AudioCDTrack[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a audiocdtrack by id.
   */
  async get(id: string): Promise<AudioCDTrack> {
    return this.#http.rpc<AudioCDTrack>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new audiocdtrack.
   */
  async create(input: AudioCDTrackCreateInput): Promise<AudioCDTrack> {
    return this.#http.rpc<AudioCDTrack>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing audiocdtrack.
   */
  async update(id: string, input: AudioCDTrackUpdateInput): Promise<AudioCDTrack> {
    return this.#http.rpc<AudioCDTrack>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a audiocdtrack.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
