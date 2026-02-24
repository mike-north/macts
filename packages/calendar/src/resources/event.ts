/**
 * Event client for Calendar SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Event, EventCreateInput, EventUpdateInput } from '../types.js';

/**
 * Client for a calendar event.
 */
export class EventResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all events.
   */
  async list(): Promise<Event[]> {
    return this.#http.rpc<Event[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a event by uid.
   */
  async get(uid: string): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.get`, { uid });
  }

  /**
   * Create a new event.
   */
  async create(input: EventCreateInput): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing event.
   */
  async update(uid: string, input: EventUpdateInput): Promise<Event> {
    return this.#http.rpc<Event>(`${this.#app}.${this.#resource}.update`, { uid, ...input });
  }

  /**
   * Delete a event.
   */
  async delete(uid: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { uid });
  }





  /**
   * Show the event or to-do in the calendar window
   */
  async show(): Promise<void> {
    await this.#http.rpc<undefined>('calendar.events.show', {});
  }
}
