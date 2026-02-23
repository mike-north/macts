/**
 * LocalDomainObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { LocalDomainObject, LocalDomainObjectCreateInput, LocalDomainObjectUpdateInput } from '../types.js';

/**
 * Client for the local domain in the file system.
 */
export class LocalDomainObjectResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all localdomainobjects.
   */
  async list(): Promise<LocalDomainObject[]> {
    return this.#http.rpc<LocalDomainObject[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a localdomainobject by id.
   */
  async get(id: string): Promise<LocalDomainObject> {
    return this.#http.rpc<LocalDomainObject>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new localdomainobject.
   */
  async create(input: LocalDomainObjectCreateInput): Promise<LocalDomainObject> {
    return this.#http.rpc<LocalDomainObject>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing localdomainobject.
   */
  async update(id: string, input: LocalDomainObjectUpdateInput): Promise<LocalDomainObject> {
    return this.#http.rpc<LocalDomainObject>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a localdomainobject.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
