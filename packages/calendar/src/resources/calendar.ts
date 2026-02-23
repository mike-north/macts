/**
 * Calendar client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Calendar, CalendarCreateInput, CalendarUpdateInput } from '../types.js';

/**
 * Client for a calendar containing events.
 */
export class CalendarResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all calendars.
   */
  async list(): Promise<Calendar[]> {
    return this.#http.rpc<Calendar[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a calendar by calendarIdentifier.
   */
  async get(calendarIdentifier: string): Promise<Calendar> {
    return this.#http.rpc<Calendar>(`${this.#app}.${this.#resource}.get`, { calendarIdentifier });
  }

  /**
   * Create a new calendar.
   */
  async create(input: CalendarCreateInput): Promise<Calendar> {
    return this.#http.rpc<Calendar>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing calendar.
   */
  async update(calendarIdentifier: string, input: CalendarUpdateInput): Promise<Calendar> {
    return this.#http.rpc<Calendar>(`${this.#app}.${this.#resource}.update`, { calendarIdentifier, ...input });
  }

  /**
   * Delete a calendar.
   */
  async delete(calendarIdentifier: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { calendarIdentifier });
  }



}
