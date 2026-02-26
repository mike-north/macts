/**
 * DisplayAlarm client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { DisplayAlarm, DisplayAlarmCreateInput, DisplayAlarmUpdateInput } from '../types.js';

/**
 * Client for a message/display alarm.
 */
export class DisplayAlarmResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all displayalarms.
   */
  async list(): Promise<DisplayAlarm[]> {
    return this.#http.rpc<DisplayAlarm[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a displayalarm by id.
   */
  async get(id: string): Promise<DisplayAlarm> {
    return this.#http.rpc<DisplayAlarm>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new displayalarm.
   */
  async create(input: DisplayAlarmCreateInput): Promise<DisplayAlarm> {
    return this.#http.rpc<DisplayAlarm>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing displayalarm.
   */
  async update(id: string, input: DisplayAlarmUpdateInput): Promise<DisplayAlarm> {
    return this.#http.rpc<DisplayAlarm>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a displayalarm.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
