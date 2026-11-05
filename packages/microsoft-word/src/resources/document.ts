/**
 * Document client for Microsoft Word SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Document } from '../types.js'

import {
  Integer as __mactsInteger,
  ValueTypes as __mactsValueTypes,
  ValidationError as __mactsValidationError,
} from '@macts/contracts'

/** Integer wire policy shared with the operation contracts, built once per module. */
const __mactsIntegerWire = __mactsValueTypes.integer().wire

/** Validate CLI text or an SDK number before dispatch, without implicit rounding. */
function __mactsIntegerInput(value: unknown): __mactsInteger {
  const integer = typeof value === 'number' || typeof value === 'string' ? String(value) : undefined
  const candidate = { integer }
  if (!__mactsIntegerWire.safeParse(candidate).success || integer === undefined) {
    const message =
      'Expected a canonical decimal integer from -9007199254740991 to 9007199254740991.'
    throw new __mactsValidationError(message, { issues: [{ path: [], message }] })
  }
  return __mactsInteger.validate(Number(integer))
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
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Document>> {
    return this.#http.invoke<Page<Document>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Get a document by id.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Document> {
    return this.#http.invoke<Document>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Save the specified document
   */
  async save(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.save`,
      {},
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Save the document with a new name or format
   */
  async saveAs(
    fileName: string,
    fileFormat?: Parameters<import('../contract/index.js').DocumentResourceClient['saveAs']>[1],
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.saveAs`,
      { fileName, fileFormat },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Close the specified document
   */
  async close(
    saving?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.close`,
      { saving },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Print the specified document
   */
  async print(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.print`,
      {},
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Activate the specified document window
   */
  async activate(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.activate`,
      {},
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Create a text range by character positions
   */
  async createRange(
    start?: number,
    end?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.createRange`,
      {
        ...(start === undefined ? {} : { start: __mactsIntegerInput(start) }),
        ...(end === undefined ? {} : { end: __mactsIntegerInput(end) }),
      },
      __mactsOptions,
      'Document'
    )
  }
}
