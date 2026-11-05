/**
 * Document client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Document, SaveFormat } from '../types.js'

import {
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** Integer wire policy shared with the operation contracts, built once per module. */
const __mactsIntegerWire = __mactsValueTypes.integer().wire

/** Validate CLI text or an SDK number before dispatch, without implicit rounding. */
function __mactsIntegerInput(value: unknown): { integer: string } {
  const integer = typeof value === 'number' || typeof value === 'string' ? String(value) : undefined
  const candidate = { integer }
  if (!__mactsIntegerWire.safeParse(candidate).success || integer === undefined) {
    const message =
      'Expected a canonical decimal integer from -9007199254740991 to 9007199254740991.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return { integer }
}

/**
 * Client for a microsoft word document.
 */
export class DocumentResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all documents, as one page.
   */
  async list(): Promise<Page<Document>> {
    return this.#http.rpc<Page<Document>>(`${this.#app}.${this.#resource}.list`)
  }

  /**
   * Get a document by id.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(id: string): Promise<Document> {
    return this.#http.rpc<Document>(`${this.#app}.${this.#resource}.get`, { id })
  }

  /**
   * Save the specified document
   */
  async save(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.save`, {})
  }

  /**
   * Save the document with a new name or format
   */
  async saveAs(fileName: string, fileFormat?: SaveFormat): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.saveAs`, {
      fileName,
      fileFormat,
    })
  }

  /**
   * Close the specified document
   */
  async close(saving?: boolean): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.close`, { saving })
  }

  /**
   * Print the specified document
   */
  async print(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.print`, {})
  }

  /**
   * Activate the specified document window
   */
  async activate(): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.activate`, {})
  }

  /**
   * Create a text range by character positions
   */
  async createRange(start?: number, end?: number): Promise<void> {
    await this.#http.rpc<undefined>(`${this.#app}.${this.#resource}.createRange`, {
      ...(start === undefined ? {} : { start: __mactsIntegerInput(start) }),
      ...(end === undefined ? {} : { end: __mactsIntegerInput(end) }),
    })
  }
}
