/**
 * Participant client for Messages SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type { Participant, ParticipantCreateInput, ParticipantUpdateInput } from '../types.js'

/**
 * Client for a participant for an account..
 */
export class ParticipantResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all participants.
   */
  async list(): Promise<Participant[]> {
    return this.#http.rpc<Participant[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a participant by id.
   */
  async get(id: string): Promise<Participant> {
    return this.#http.rpc<Participant>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new participant.
   */
  async create(input: ParticipantCreateInput): Promise<Participant> {
    return this.#http.rpc<Participant>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing participant.
   */
  async update(id: string, input: ParticipantUpdateInput): Promise<Participant> {
    return this.#http.rpc<Participant>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a participant.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
