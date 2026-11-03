/**
 * Note client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Note, NoteCreateInput } from '../types.js'

/**
 * Client for a note.
 */
export class NoteResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List notes, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {}
  ): Promise<{ items: Note[]; nextCursor?: string }> {
    return this.#http.rpc<{ items: Note[]; nextCursor?: string }>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: { integer: String(page.pageSize) } }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      }
    )
  }

  /**
   * Get a note by name.
   */
  async get(name: string): Promise<Note> {
    return this.#http.rpc<Note>(`${this.#app}.${this.#resource}.get`, { name })
  }

  /**
   * Create a new note.
   */
  async create(input: NoteCreateInput): Promise<Note> {
    return this.#http.rpc<Note>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Show a note in the Notes app
   */
  async show(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.show`, { name })
  }
}
