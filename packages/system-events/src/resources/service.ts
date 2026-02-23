/**
 * Service client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Service, ServiceCreateInput, ServiceUpdateInput } from '../types.js';

/**
 * Client for a collection of settings for a network service.
 */
export class ServiceResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all services.
   */
  async list(): Promise<Service[]> {
    return this.#http.rpc<Service[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a service by id.
   */
  async get(id: string): Promise<Service> {
    return this.#http.rpc<Service>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new service.
   */
  async create(input: ServiceCreateInput): Promise<Service> {
    return this.#http.rpc<Service>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing service.
   */
  async update(id: string, input: ServiceUpdateInput): Promise<Service> {
    return this.#http.rpc<Service>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a service.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
