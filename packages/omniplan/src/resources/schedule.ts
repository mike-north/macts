/**
 * Schedule client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput } from '../types.js';

/**
 * Client for a schedule of working time.
 */
export class ScheduleResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all schedules.
   */
  async list(): Promise<Schedule[]> {
    return this.#http.rpc<Schedule[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a schedule by id.
   */
  async get(id: string): Promise<Schedule> {
    return this.#http.rpc<Schedule>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new schedule.
   */
  async create(input: ScheduleCreateInput): Promise<Schedule> {
    return this.#http.rpc<Schedule>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing schedule.
   */
  async update(id: string, input: ScheduleUpdateInput): Promise<Schedule> {
    return this.#http.rpc<Schedule>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a schedule.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
