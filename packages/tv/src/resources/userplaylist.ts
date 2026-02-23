/**
 * UserPlaylist client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { UserPlaylist, UserPlaylistCreateInput, UserPlaylistUpdateInput } from '../types.js';

/**
 * Client for custom playlists created by the user.
 */
export class UserPlaylistResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all userplaylists.
   */
  async list(): Promise<UserPlaylist[]> {
    return this.#http.rpc<UserPlaylist[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a userplaylist by id.
   */
  async get(id: string): Promise<UserPlaylist> {
    return this.#http.rpc<UserPlaylist>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new userplaylist.
   */
  async create(input: UserPlaylistCreateInput): Promise<UserPlaylist> {
    return this.#http.rpc<UserPlaylist>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing userplaylist.
   */
  async update(id: string, input: UserPlaylistUpdateInput): Promise<UserPlaylist> {
    return this.#http.rpc<UserPlaylist>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a userplaylist.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
