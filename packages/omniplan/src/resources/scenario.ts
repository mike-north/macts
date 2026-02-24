/**
 * Scenario client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Scenario, ScenarioCreateInput, ScenarioUpdateInput } from '../types.js';

/**
 * Client for an alternative project plan.
 */
export class ScenarioResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all scenarios.
   */
  async list(): Promise<Scenario[]> {
    return this.#http.rpc<Scenario[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a scenario by id.
   */
  async get(id: string): Promise<Scenario> {
    return this.#http.rpc<Scenario>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new scenario.
   */
  async create(input: ScenarioCreateInput): Promise<Scenario> {
    return this.#http.rpc<Scenario>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing scenario.
   */
  async update(id: string, input: ScenarioUpdateInput): Promise<Scenario> {
    return this.#http.rpc<Scenario>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a scenario.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }


}
