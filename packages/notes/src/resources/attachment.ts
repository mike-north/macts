/**
 * Attachment client for Notes SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Attachment, AttachmentCreateInput, AttachmentUpdateInput } from '../types.js';

/**
 * Client for a note attachment.
 */
export class AttachmentResourceClient {
  readonly #http: HttpClient;
  readonly #app: string;
  readonly #resource: string;

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http;
    this.#app = app;
    this.#resource = resource;
  }

  /**
   * List all attachments.
   */
  async list(): Promise<Attachment[]> {
    return this.#http.rpc<Attachment[]>(`${this.#app}.${this.#resource}.list`);
  }

  /**
   * Get a attachment by name.
   */
  async get(name: string): Promise<Attachment> {
    return this.#http.rpc<Attachment>(`${this.#app}.${this.#resource}.get`, { name });
  }

  /**
   * Create a new attachment.
   */
  async create(input: AttachmentCreateInput): Promise<Attachment> {
    return this.#http.rpc<Attachment>(`${this.#app}.${this.#resource}.create`, input);
  }

  /**
   * Update an existing attachment.
   */
  async update(name: string, input: AttachmentUpdateInput): Promise<Attachment> {
    return this.#http.rpc<Attachment>(`${this.#app}.${this.#resource}.update`, { name, ...input });
  }

  /**
   * Delete a attachment.
   */
  async delete(name: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { name });
  }


}
