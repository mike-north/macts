/**
 * ScriptingEnumerator client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScriptingEnumerator, ScriptingEnumeratorCreateInput, ScriptingEnumeratorUpdateInput } from '../types.js';

/**
 * Client for an enumerator within an enumeration within a suite within a scripting definition.
 */
export class ScriptingEnumeratorResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scriptingenumerators.
   */
  async list(): Promise<ScriptingEnumerator[]> {
    return this.#http.rpc<ScriptingEnumerator[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scriptingenumerator by id.
   */
  async get(id: string): Promise<ScriptingEnumerator> {
    return this.#http.rpc<ScriptingEnumerator>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scriptingenumerator.
   */
  async create(input: ScriptingEnumeratorCreateInput): Promise<ScriptingEnumerator> {
    return this.#http.rpc<ScriptingEnumerator>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scriptingenumerator.
   */
  async update(id: string, input: ScriptingEnumeratorUpdateInput): Promise<ScriptingEnumerator> {
    return this.#http.rpc<ScriptingEnumerator>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scriptingenumerator.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
