/**
 * Note client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Note, NoteCreateInput, NoteUpdateInput } from '../types.js';

/**
 * Client for a note.
 */
export class NoteResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all notes.
   */
  async list(): Promise<Note[]> {
    return this.#http.rpc<Note[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a note by name.
   */
  async get(name: string): Promise<Note> {
    return this.#http.rpc<Note>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new note.
   */
  async create(input: NoteCreateInput): Promise<Note> {
    return this.#http.rpc<Note>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing note.
   */
  async update(name: string, input: NoteUpdateInput): Promise<Note> {
    return this.#http.rpc<Note>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a note.
   */
  async delete(name: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { name });
  }





  /**
   * Show a note in the Notes app
   */
  async show(name: string): Promise<void> {
    return this.#http.rpc<void>('notes.notes.show', { name });
  }
}
