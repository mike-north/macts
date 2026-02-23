/**
 * ScriptingClass client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScriptingClass, ScriptingClassCreateInput, ScriptingClassUpdateInput } from '../types.js';

/**
 * Client for a class within a suite within a scripting definition.
 */
export class ScriptingClassResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scriptingclasses.
   */
  async list(): Promise<ScriptingClass[]> {
    return this.#http.rpc<ScriptingClass[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scriptingclass by id.
   */
  async get(id: string): Promise<ScriptingClass> {
    return this.#http.rpc<ScriptingClass>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scriptingclass.
   */
  async create(input: ScriptingClassCreateInput): Promise<ScriptingClass> {
    return this.#http.rpc<ScriptingClass>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scriptingclass.
   */
  async update(id: string, input: ScriptingClassUpdateInput): Promise<ScriptingClass> {
    return this.#http.rpc<ScriptingClass>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scriptingclass.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
