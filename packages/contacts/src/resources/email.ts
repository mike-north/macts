/**
 * Email client for Contacts SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Email } from '../types.js'

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
 * Client for email address for a person..
 */
export class EmailResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the emails of one person, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    personId: string,
    page: { pageSize?: number; cursor?: string } = {},
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Email>> {
    return this.#http.invoke<Page<Email>>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: __mactsIntegerInput(page.pageSize) }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        personId,
      },
      __mactsOptions
    )
  }

  /**
   * Get a email by id within a parent scope.
   */
  async get(
    personId: string,
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Email> {
    return this.#http.invoke<Email>(
      `${this.#app}.${this.#resource}.get`,
      { personId, id },
      __mactsOptions
    )
  }
}
