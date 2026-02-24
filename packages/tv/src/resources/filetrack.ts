/**
 * FileTrack client for TV SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { FileTrack, FileTrackCreateInput, FileTrackUpdateInput } from '../types.js';

/**
 * Client for a track representing a video file.
 */
export class FileTrackResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all filetracks.
   */
  async list(): Promise<FileTrack[]> {
    return this.#http.rpc<FileTrack[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a filetrack by id.
   */
  async get(id: string): Promise<FileTrack> {
    return this.#http.rpc<FileTrack>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new filetrack.
   */
  async create(input: FileTrackCreateInput): Promise<FileTrack> {
    return this.#http.rpc<FileTrack>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing filetrack.
   */
  async update(id: string, input: FileTrackUpdateInput): Promise<FileTrack> {
    return this.#http.rpc<FileTrack>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a filetrack.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


  /**
   * update file track information from the current information in the track’s file
   */
  async refresh(): Promise<void> {
    await this.#http.rpc<undefined>('tv.filetracks.refresh', {});
  }
}
