/**
 * SoundAlarm client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { SoundAlarm, SoundAlarmCreateInput, SoundAlarmUpdateInput } from '../types.js';

/**
 * Client for a sound alarm.
 */
export class SoundAlarmResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all soundalarms.
   */
  async list(): Promise<SoundAlarm[]> {
    return this.#http.rpc<SoundAlarm[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a soundalarm by id.
   */
  async get(id: string): Promise<SoundAlarm> {
    return this.#http.rpc<SoundAlarm>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new soundalarm.
   */
  async create(input: SoundAlarmCreateInput): Promise<SoundAlarm> {
    return this.#http.rpc<SoundAlarm>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing soundalarm.
   */
  async update(id: string, input: SoundAlarmUpdateInput): Promise<SoundAlarm> {
    return this.#http.rpc<SoundAlarm>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a soundalarm.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
