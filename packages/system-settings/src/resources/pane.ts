/**
 * Pane client for System Settings SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Pane, PaneCreateInput, PaneUpdateInput } from '../types.js';

/**
 * Client for a settings pane..
 */
export class PaneResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all panes.
   */
  async list(): Promise<Pane[]> {
    return this.#http.rpc<Pane[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a pane by id.
   */
  async get(id: string): Promise<Pane> {
    return this.#http.rpc<Pane>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new pane.
   */
  async create(input: PaneCreateInput): Promise<Pane> {
    return this.#http.rpc<Pane>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing pane.
   */
  async update(id: string, input: PaneUpdateInput): Promise<Pane> {
    return this.#http.rpc<Pane>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a pane.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }


  /**
   * Prompt for authorization for a settings pane. Deprecated: no longer does anything.
   */
  async authorize(): Promise<void> {
    return this.#http.rpc<void>('system-settings.panes.authorize', {});
  }


  /**
   * Times and loads given settings pane and returns load time. Deprecated: no longer does anything.
   */
  async timedLoad(): Promise<void> {
    return this.#http.rpc<void>('system-settings.panes.timedLoad', {});
  }
}
