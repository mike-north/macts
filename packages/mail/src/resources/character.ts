/**
 * Character client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Character, CharacterCreateInput, CharacterUpdateInput } from '../types.js';

/**
 * Client for this subdivides the text into characters..
 */
export class CharacterResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all characters.
   */
  async list(): Promise<Character[]> {
    return this.#http.rpc<Character[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a character by id.
   */
  async get(id: string): Promise<Character> {
    return this.#http.rpc<Character>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new character.
   */
  async create(input: CharacterCreateInput): Promise<Character> {
    return this.#http.rpc<Character>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing character.
   */
  async update(id: string, input: CharacterUpdateInput): Promise<Character> {
    return this.#http.rpc<Character>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a character.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
