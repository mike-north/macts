/**
 * Album client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Album, AlbumCreateInput, AlbumUpdateInput } from '../types.js';

/**
 * Client for an album. a container that holds media items.
 */
export class AlbumResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all albums.
   */
  async list(): Promise<Album[]> {
    return this.#http.rpc<Album[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a album by id.
   */
  async get(id: string): Promise<Album> {
    return this.#http.rpc<Album>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new album.
   */
  async create(input: AlbumCreateInput): Promise<Album> {
    return this.#http.rpc<Album>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing album.
   */
  async update(id: string, input: AlbumUpdateInput): Promise<Album> {
    return this.#http.rpc<Album>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a album.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
