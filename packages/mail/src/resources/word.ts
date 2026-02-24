/**
 * Word client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Word, WordCreateInput, WordUpdateInput } from '../types.js';

/**
 * Client for this subdivides the text into words..
 */
export class WordResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all words.
   */
  async list(): Promise<Word[]> {
    return this.#http.rpc<Word[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a word by id.
   */
  async get(id: string): Promise<Word> {
    return this.#http.rpc<Word>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new word.
   */
  async create(input: WordCreateInput): Promise<Word> {
    return this.#http.rpc<Word>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing word.
   */
  async update(id: string, input: WordUpdateInput): Promise<Word> {
    return this.#http.rpc<Word>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a word.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
