/**
 * Action client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Action, ActionCreateInput, ActionUpdateInput } from '../types.js';

/**
 * Client for an action that can be performed on the ui element.
 */
export class ActionResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all actions.
   */
  async list(): Promise<Action[]> {
    return this.#http.rpc<Action[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a action by id.
   */
  async get(id: string): Promise<Action> {
    return this.#http.rpc<Action>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new action.
   */
  async create(input: ActionCreateInput): Promise<Action> {
    return this.#http.rpc<Action>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing action.
   */
  async update(id: string, input: ActionUpdateInput): Promise<Action> {
    return this.#http.rpc<Action>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a action.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


  /**
   * cause the target process to behave as if the action were applied to its UI element
   */
  async perform(): Promise<void> {
    await this.#http.rpc<undefined>('system-events.actions.perform', {});
  }
}
