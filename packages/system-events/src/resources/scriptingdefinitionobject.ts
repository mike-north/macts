/**
 * ScriptingDefinitionObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScriptingDefinitionObject, ScriptingDefinitionObjectCreateInput, ScriptingDefinitionObjectUpdateInput } from '../types.js';

/**
 * Client for the scripting definition of the system events applicaation.
 */
export class ScriptingDefinitionObjectResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scriptingdefinitionobjects.
   */
  async list(): Promise<ScriptingDefinitionObject[]> {
    return this.#http.rpc<ScriptingDefinitionObject[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scriptingdefinitionobject by id.
   */
  async get(id: string): Promise<ScriptingDefinitionObject> {
    return this.#http.rpc<ScriptingDefinitionObject>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scriptingdefinitionobject.
   */
  async create(input: ScriptingDefinitionObjectCreateInput): Promise<ScriptingDefinitionObject> {
    return this.#http.rpc<ScriptingDefinitionObject>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scriptingdefinitionobject.
   */
  async update(id: string, input: ScriptingDefinitionObjectUpdateInput): Promise<ScriptingDefinitionObject> {
    return this.#http.rpc<ScriptingDefinitionObject>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scriptingdefinitionobject.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
