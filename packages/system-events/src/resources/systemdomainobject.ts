/**
 * SystemDomainObject client for System Events SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { SystemDomainObject, SystemDomainObjectCreateInput, SystemDomainObjectUpdateInput } from '../types.js';

/**
 * Client for the system domain in the file system.
 */
export class SystemDomainObjectResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all systemdomainobjects.
   */
  async list(): Promise<SystemDomainObject[]> {
    return this.#http.rpc<SystemDomainObject[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a systemdomainobject by id.
   */
  async get(id: string): Promise<SystemDomainObject> {
    return this.#http.rpc<SystemDomainObject>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new systemdomainobject.
   */
  async create(input: SystemDomainObjectCreateInput): Promise<SystemDomainObject> {
    return this.#http.rpc<SystemDomainObject>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing systemdomainobject.
   */
  async update(id: string, input: SystemDomainObjectUpdateInput): Promise<SystemDomainObject> {
    return this.#http.rpc<SystemDomainObject>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a systemdomainobject.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
