/**
 * Artwork client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Artwork, ArtworkCreateInput, ArtworkUpdateInput } from '../types.js';

/**
 * Client for a piece of art within a track or playlist.
 */
export class ArtworkResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all artworks.
   */
  async list(): Promise<Artwork[]> {
    return this.#http.rpc<Artwork[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a artwork by id.
   */
  async get(id: string): Promise<Artwork> {
    return this.#http.rpc<Artwork>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new artwork.
   */
  async create(input: ArtworkCreateInput): Promise<Artwork> {
    return this.#http.rpc<Artwork>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing artwork.
   */
  async update(id: string, input: ArtworkUpdateInput): Promise<Artwork> {
    return this.#http.rpc<Artwork>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a artwork.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
