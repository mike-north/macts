/**
 * Process client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Process, ProcessCreateInput, ProcessUpdateInput } from '../types.js';

/**
 * Client for a process running on this computer.
 */
export class ProcessResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all processes.
   */
  async list(): Promise<Process[]> {
    return this.#http.rpc<Process[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a process by id.
   */
  async get(id: string): Promise<Process> {
    return this.#http.rpc<Process>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new process.
   */
  async create(input: ProcessCreateInput): Promise<Process> {
    return this.#http.rpc<Process>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing process.
   */
  async update(id: string, input: ProcessUpdateInput): Promise<Process> {
    return this.#http.rpc<Process>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a process.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
