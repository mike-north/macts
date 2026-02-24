/**
 * MailAttachment client for Mail SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
import type {
  MailAttachment,
  MailAttachmentCreateInput,
  MailAttachmentUpdateInput,
} from '../types.js'

/**
 * Client for a file attached to a received message..
 */
export class MailAttachmentResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all mailattachments.
   */
  async list(): Promise<MailAttachment[]> {
    return this.#http.rpc<MailAttachment[]>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a mailattachment by id.
   */
  async get(id: string): Promise<MailAttachment> {
    return this.#http.rpc<MailAttachment>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Create a new mailattachment.
   */
  async create(input: MailAttachmentCreateInput): Promise<MailAttachment> {
    return this.#http.rpc<MailAttachment>(`${this.#app}.${this.#resource}.create`, input)
  }

  /**
   * Update an existing mailattachment.
   */
  async update(id: string, input: MailAttachmentUpdateInput): Promise<MailAttachment> {
    return this.#http.rpc<MailAttachment>(`${this.#app}.${this.#resource}.update`, { id, ...input })
  }

  /**
   * Delete a mailattachment.
   */
  async delete(id: string): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.delete`, { id })
  }
}
