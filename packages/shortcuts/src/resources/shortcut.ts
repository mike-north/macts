/**
 * Shortcut client for Shortcuts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Shortcut, ShortcutCreateInput, ShortcutUpdateInput } from '../types.js';

/**
 * Client for a shortcut in the shortcuts application.
 */
export class ShortcutResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all shortcuts.
   */
  async list(): Promise<Shortcut[]> {
    return this.#http.rpc<Shortcut[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a shortcut by id.
   */
  async get(id: string): Promise<Shortcut> {
    return this.#http.rpc<Shortcut>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new shortcut.
   */
  async create(input: ShortcutCreateInput): Promise<Shortcut> {
    return this.#http.rpc<Shortcut>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing shortcut.
   */
  async update(id: string, input: ShortcutUpdateInput): Promise<Shortcut> {
    return this.#http.rpc<Shortcut>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a shortcut.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }




  /**
   * Run a shortcut. To run a shortcut in the background, without opening the Shortcuts app, tell 'Shortcuts Events' instead of 'Shortcuts'.
   */
  async run(id: string, withInput?: unknown): Promise<void> {
    return this.#http.rpc<void>('shortcuts.shortcuts.run', { id, withInput });
  }
}
