/**
 * MailAlarm client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { MailAlarm, MailAlarmCreateInput, MailAlarmUpdateInput } from '../types.js';

/**
 * Client for a mail/email alarm.
 */
export class MailAlarmResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all mailalarms.
   */
  async list(): Promise<MailAlarm[]> {
    return this.#http.rpc<MailAlarm[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a mailalarm by id.
   */
  async get(id: string): Promise<MailAlarm> {
    return this.#http.rpc<MailAlarm>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new mailalarm.
   */
  async create(input: MailAlarmCreateInput): Promise<MailAlarm> {
    return this.#http.rpc<MailAlarm>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing mailalarm.
   */
  async update(id: string, input: MailAlarmUpdateInput): Promise<MailAlarm> {
    return this.#http.rpc<MailAlarm>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a mailalarm.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
