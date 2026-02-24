/**
 * ScriptingElement client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScriptingElement, ScriptingElementCreateInput, ScriptingElementUpdateInput } from '../types.js';

/**
 * Client for an element within a class within a suite within a scripting definition.
 */
export class ScriptingElementResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scriptingelements.
   */
  async list(): Promise<ScriptingElement[]> {
    return this.#http.rpc<ScriptingElement[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scriptingelement by id.
   */
  async get(id: string): Promise<ScriptingElement> {
    return this.#http.rpc<ScriptingElement>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scriptingelement.
   */
  async create(input: ScriptingElementCreateInput): Promise<ScriptingElement> {
    return this.#http.rpc<ScriptingElement>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scriptingelement.
   */
  async update(id: string, input: ScriptingElementUpdateInput): Promise<ScriptingElement> {
    return this.#http.rpc<ScriptingElement>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scriptingelement.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
