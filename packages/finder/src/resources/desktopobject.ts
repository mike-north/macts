/**
 * DesktopObject client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { DesktopObject, DesktopObjectCreateInput, DesktopObjectUpdateInput } from '../types.js';

/**
 * Client for desktop-object is the class of the "desktop" object.
 */
export class DesktopObjectResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all desktopobjects.
   */
  async list(): Promise<DesktopObject[]> {
    return this.#http.rpc<DesktopObject[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a desktopobject by id.
   */
  async get(id: string): Promise<DesktopObject> {
    return this.#http.rpc<DesktopObject>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new desktopobject.
   */
  async create(input: DesktopObjectCreateInput): Promise<DesktopObject> {
    return this.#http.rpc<DesktopObject>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing desktopobject.
   */
  async update(id: string, input: DesktopObjectUpdateInput): Promise<DesktopObject> {
    return this.#http.rpc<DesktopObject>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a desktopobject.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
