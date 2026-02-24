/**
 * Variable client for Automator SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Variable, VariableCreateInput, VariableUpdateInput } from '../types.js';

/**
 * Client for a variable used by the workflow.
 */
export class VariableResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all variables.
   */
  async list(): Promise<Variable[]> {
    return this.#http.rpc<Variable[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a variable by id.
   */
  async get(id: string): Promise<Variable> {
    return this.#http.rpc<Variable>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new variable.
   */
  async create(input: VariableCreateInput): Promise<Variable> {
    return this.#http.rpc<Variable>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing variable.
   */
  async update(id: string, input: VariableUpdateInput): Promise<Variable> {
    return this.#http.rpc<Variable>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a variable.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
