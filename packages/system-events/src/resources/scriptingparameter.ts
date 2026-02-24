/**
 * ScriptingParameter client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScriptingParameter, ScriptingParameterCreateInput, ScriptingParameterUpdateInput } from '../types.js';

/**
 * Client for a parameter within a command within a suite within a scripting definition.
 */
export class ScriptingParameterResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scriptingparameters.
   */
  async list(): Promise<ScriptingParameter[]> {
    return this.#http.rpc<ScriptingParameter[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scriptingparameter by id.
   */
  async get(id: string): Promise<ScriptingParameter> {
    return this.#http.rpc<ScriptingParameter>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scriptingparameter.
   */
  async create(input: ScriptingParameterCreateInput): Promise<ScriptingParameter> {
    return this.#http.rpc<ScriptingParameter>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scriptingparameter.
   */
  async update(id: string, input: ScriptingParameterUpdateInput): Promise<ScriptingParameter> {
    return this.#http.rpc<ScriptingParameter>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scriptingparameter.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
