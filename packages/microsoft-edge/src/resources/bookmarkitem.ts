/**
 * BookmarkItem client for Microsoft Edge SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { BookmarkItem, BookmarkItemCreateInput, BookmarkItemUpdateInput } from '../types.js';

/**
 * Client for an item consists of an url and the title of a bookmark.
 */
export class BookmarkItemResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all bookmarkitems.
   */
  async list(): Promise<BookmarkItem[]> {
    return this.#http.rpc<BookmarkItem[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a bookmarkitem by id.
   */
  async get(id: string): Promise<BookmarkItem> {
    return this.#http.rpc<BookmarkItem>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new bookmarkitem.
   */
  async create(input: BookmarkItemCreateInput): Promise<BookmarkItem> {
    return this.#http.rpc<BookmarkItem>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing bookmarkitem.
   */
  async update(id: string, input: BookmarkItemUpdateInput): Promise<BookmarkItem> {
    return this.#http.rpc<BookmarkItem>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a bookmarkitem.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
