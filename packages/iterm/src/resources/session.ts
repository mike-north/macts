/**
 * Session client for iTerm SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Session, SessionCreateInput, SessionUpdateInput } from '../types.js';

/**
 * Client for a terminal session.
 */
export class SessionResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all sessions.
   */
  async list(): Promise<Session[]> {
    return this.#http.rpc<Session[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a session by id.
   */
  async get(id: string): Promise<Session> {
    return this.#http.rpc<Session>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new session.
   */
  async create(input: SessionCreateInput): Promise<Session> {
    return this.#http.rpc<Session>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing session.
   */
  async update(id: string, input: SessionUpdateInput): Promise<Session> {
    return this.#http.rpc<Session>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a session.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
