/**
 * Group client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Group, GroupCreateInput, GroupUpdateInput } from '../types.js';

/**
 * Client for a group record in the address book database.
 */
export class GroupResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all groups.
   */
  async list(): Promise<Group[]> {
    return this.#http.rpc<Group[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a group by id.
   */
  async get(id: string): Promise<Group> {
    return this.#http.rpc<Group>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new group.
   */
  async create(input: GroupCreateInput): Promise<Group> {
    return this.#http.rpc<Group>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing group.
   */
  async update(id: string, input: GroupUpdateInput): Promise<Group> {
    return this.#http.rpc<Group>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a group.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
