/**
 * Folder client for Photos SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Folder } from '../types.js'

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
 * Client for a folder. a container that holds albums and other folders, but not media items.
 */
export class FolderResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List folders, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    page: { pageSize?: number; cursor?: string } = {},
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Folder>> {
    return this.#http.invoke<Page<Folder>>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: __mactsIntegerInput(page.pageSize) }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
      },
      __mactsOptions,
      'Folder'
    )
  }

  /**
   * Get a folder by id.
   */
  async get(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<Folder> {
    return this.#http.invoke<Folder>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Folder'
    )
  }
}
