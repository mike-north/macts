/**
 * Note client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
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
   * List all notes, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Note>> {
    return this.#http.invoke<Page<Note>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Note'
    )
  }

  /**
   * Get a note by name.
   * When several notes share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(name: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Note> {
    return this.#http.invoke<Note>(
      `${this.#app}.${this.#resource}.get`,
      { name },
      __mactsOptions,
      'Note'
    )
  }

  /**
   * Create a new note.
   */
  async create(
    input: NoteCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Note> {
    return this.#http.invoke<Note>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Note'
    )
  }

  /**
   * Show a note in the Notes app.
   * When several notes share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async show(name: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.show`,
      { name },
      __mactsOptions,
      'Note'
    )
  }
}
