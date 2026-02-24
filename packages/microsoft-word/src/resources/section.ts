/**
 * Section client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Section, SectionCreateInput, SectionUpdateInput } from '../types.js';

/**
 * Client for a section in a document.
 */
export class SectionResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all sections.
   */
  async list(): Promise<Section[]> {
    return this.#http.rpc<Section[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a section by id.
   */
  async get(id: string): Promise<Section> {
    return this.#http.rpc<Section>(`${this.#app}.${this.#resource}.get`, { id });
  }

  /**
   * Create a new section.
   */
  async create(input: SectionCreateInput): Promise<Section> {
    return this.#http.rpc<Section>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing section.
   */
  async update(id: string, input: SectionUpdateInput): Promise<Section> {
    return this.#http.rpc<Section>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a section.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
