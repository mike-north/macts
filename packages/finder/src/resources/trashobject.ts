/**
 * TrashObject client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { TrashObject, TrashObjectCreateInput, TrashObjectUpdateInput } from '../types.js';

/**
 * Client for trash-object is the class of the “trash” object.
 */
export class TrashObjectResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all trashobjects.
   */
  async list(): Promise<TrashObject[]> {
    return this.#http.rpc<TrashObject[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a trashobject by id.
   */
  async get(id: string): Promise<TrashObject> {
    return this.#http.rpc<TrashObject>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new trashobject.
   */
  async create(input: TrashObjectCreateInput): Promise<TrashObject> {
    return this.#http.rpc<TrashObject>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing trashobject.
   */
  async update(id: string, input: TrashObjectUpdateInput): Promise<TrashObject> {
    return this.#http.rpc<TrashObject>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a trashobject.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
