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
   * Save the specified document.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async save(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.save`,
      { id },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Save the document with a new name or format.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async saveAs(
    id: string,
    fileName: string,
    fileFormat?: Parameters<import('../contract/index.js').DocumentResourceClient['saveAs']>[2],
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.saveAs`,
      { id, fileName, fileFormat },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Close the specified document.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async close(
    id: string,
    saving?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.close`,
      { id, saving },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Print the specified document.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async print(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.print`,
      { id },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Activate the specified document window.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async activate(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.activate`,
      { id },
      __mactsOptions,
      'Document'
    )
  }

  /**
   * Create a text range by character positions.
   * When several documents share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.
   */
  async createRange(
    id: string,
    start?: number,
    end?: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.createRange`,
      {
        id,
        ...(start === undefined ? {} : { start: __mactsIntegerInput(start) }),
        ...(end === undefined ? {} : { end: __mactsIntegerInput(end) }),
      },
      __mactsOptions,
      'Document'
    )
  }
}
