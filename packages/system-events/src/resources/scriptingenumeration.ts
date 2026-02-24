/**
 * ScriptingEnumeration client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScriptingEnumeration, ScriptingEnumerationCreateInput, ScriptingEnumerationUpdateInput } from '../types.js';

/**
 * Client for an enumeration within a suite within a scripting definition.
 */
export class ScriptingEnumerationResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scriptingenumerations.
   */
  async list(): Promise<ScriptingEnumeration[]> {
    return this.#http.rpc<ScriptingEnumeration[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scriptingenumeration by id.
   */
  async get(id: string): Promise<ScriptingEnumeration> {
    return this.#http.rpc<ScriptingEnumeration>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scriptingenumeration.
   */
  async create(input: ScriptingEnumerationCreateInput): Promise<ScriptingEnumeration> {
    return this.#http.rpc<ScriptingEnumeration>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scriptingenumeration.
   */
  async update(id: string, input: ScriptingEnumerationUpdateInput): Promise<ScriptingEnumeration> {
    return this.#http.rpc<ScriptingEnumeration>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scriptingenumeration.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
