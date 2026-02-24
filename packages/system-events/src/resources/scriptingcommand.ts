/**
 * ScriptingCommand client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { ScriptingCommand, ScriptingCommandCreateInput, ScriptingCommandUpdateInput } from '../types.js';

/**
 * Client for a command within a suite within a scripting definition.
 */
export class ScriptingCommandResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scriptingcommands.
   */
  async list(): Promise<ScriptingCommand[]> {
    return this.#http.rpc<ScriptingCommand[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scriptingcommand by id.
   */
  async get(id: string): Promise<ScriptingCommand> {
    return this.#http.rpc<ScriptingCommand>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scriptingcommand.
   */
  async create(input: ScriptingCommandCreateInput): Promise<ScriptingCommand> {
    return this.#http.rpc<ScriptingCommand>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scriptingcommand.
   */
  async update(id: string, input: ScriptingCommandUpdateInput): Promise<ScriptingCommand> {
    return this.#http.rpc<ScriptingCommand>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scriptingcommand.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
