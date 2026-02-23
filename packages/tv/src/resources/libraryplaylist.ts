/**
 * LibraryPlaylist client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { LibraryPlaylist, LibraryPlaylistCreateInput, LibraryPlaylistUpdateInput } from '../types.js';

/**
 * Client for the main library playlist.
 */
export class LibraryPlaylistResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all libraryplaylists.
   */
  async list(): Promise<LibraryPlaylist[]> {
    return this.#http.rpc<LibraryPlaylist[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a libraryplaylist by id.
   */
  async get(id: string): Promise<LibraryPlaylist> {
    return this.#http.rpc<LibraryPlaylist>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new libraryplaylist.
   */
  async create(input: LibraryPlaylistCreateInput): Promise<LibraryPlaylist> {
    return this.#http.rpc<LibraryPlaylist>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing libraryplaylist.
   */
  async update(id: string, input: LibraryPlaylistUpdateInput): Promise<LibraryPlaylist> {
    return this.#http.rpc<LibraryPlaylist>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a libraryplaylist.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
