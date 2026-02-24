/**
 * Playlist client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Playlist, PlaylistCreateInput, PlaylistUpdateInput } from '../types.js';

/**
 * Client for a list of tracks/streams.
 */
export class PlaylistResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all playlists.
   */
  async list(): Promise<Playlist[]> {
    return this.#http.rpc<Playlist[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a playlist by id.
   */
  async get(id: string): Promise<Playlist> {
    return this.#http.rpc<Playlist>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new playlist.
   */
  async create(input: PlaylistCreateInput): Promise<Playlist> {
    return this.#http.rpc<Playlist>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing playlist.
   */
  async update(id: string, input: PlaylistUpdateInput): Promise<Playlist> {
    return this.#http.rpc<Playlist>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a playlist.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


  /**
   * Move playlist(s) to a new location
   */
  async move(to: string): Promise<void> {
    await this.#http.rpc<undefined>('music.playlists.move', { to });
  }


  /**
   * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
   */
  async search(_for: string, only?: string): Promise<void> {
    await this.#http.rpc<undefined>('music.playlists.search', { 'for': _for, only });
  }
}
