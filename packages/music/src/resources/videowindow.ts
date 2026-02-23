/**
 * VideoWindow client for Music SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { VideoWindow, VideoWindowCreateInput, VideoWindowUpdateInput } from '../types.js';

/**
 * Client for the video window.
 */
export class VideoWindowResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all videowindows.
   */
  async list(): Promise<VideoWindow[]> {
    return this.#http.rpc<VideoWindow[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a videowindow by id.
   */
  async get(id: string): Promise<VideoWindow> {
    return this.#http.rpc<VideoWindow>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new videowindow.
   */
  async create(input: VideoWindowCreateInput): Promise<VideoWindow> {
    return this.#http.rpc<VideoWindow>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing videowindow.
   */
  async update(id: string, input: VideoWindowUpdateInput): Promise<VideoWindow> {
    return this.#http.rpc<VideoWindow>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a videowindow.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
