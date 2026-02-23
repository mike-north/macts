/**
 * RuleCondition client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { RuleCondition, RuleConditionCreateInput, RuleConditionUpdateInput } from '../types.js';

/**
 * Client for class for conditions that can be attached to a single rule.
 */
export class RuleConditionResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all ruleconditions.
   */
  async list(): Promise<RuleCondition[]> {
    return this.#http.rpc<RuleCondition[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a rulecondition by id.
   */
  async get(id: string): Promise<RuleCondition> {
    return this.#http.rpc<RuleCondition>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new rulecondition.
   */
  async create(input: RuleConditionCreateInput): Promise<RuleCondition> {
    return this.#http.rpc<RuleCondition>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing rulecondition.
   */
  async update(id: string, input: RuleConditionUpdateInput): Promise<RuleCondition> {
    return this.#http.rpc<RuleCondition>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a rulecondition.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
