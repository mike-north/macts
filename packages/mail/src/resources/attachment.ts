/**
 * Attachment client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js';
import type { Attachment, AttachmentCreateInput, AttachmentUpdateInput } from '../types.js';

/**
 * Client for represents an inline text attachment. this class is used mainly for make commands..
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
   * Get a attachment by id.
   */
  async get(id: string): Promise<Attachment> {
    return this.#http.rpc<Attachment>(`${this.#app}.${this.#resource}.get`, { id });
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
  async update(id: string, input: AttachmentUpdateInput): Promise<Attachment> {
    return this.#http.rpc<Attachment>(`${this.#app}.${this.#resource}.update`, { id, ...input });
  }

  /**
   * Delete a attachment.
   */
  async delete(id: string): Promise<void> {
    return this.#http.rpc<void>(`${this.#app}.${this.#resource}.delete`, { id });
  }

}
