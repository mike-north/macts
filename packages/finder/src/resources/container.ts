/**
 * Container client for Finder SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Container, ContainerCreateInput, ContainerUpdateInput } from '../types.js';

/**
 * Client for an item that contains other items.
 */
export class ContainerResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all containers.
   */
  async list(): Promise<Container[]> {
    return this.#http.rpc<Container[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a container by id.
   */
  async get(id: string): Promise<Container> {
    return this.#http.rpc<Container>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new container.
   */
  async create(input: ContainerCreateInput): Promise<Container> {
    return this.#http.rpc<Container>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing container.
   */
  async update(id: string, input: ContainerUpdateInput): Promise<Container> {
    return this.#http.rpc<Container>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a container.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
