/**
 * Window client for iTerm SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Window } from '../types.js'

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
 * Client for a window..
 */
export class WindowResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all windows, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Window>> {
    return this.#http.invoke<Page<Window>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Window'
    )
  }

  /**
   * Get a window by id.
   */
  async get(
    id: string | number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Window> {
    return this.#http.invoke<Window>(
      `${this.#app}.${this.#resource}.get`,
      { id: __mactsIntegerInput(id) },
      __mactsOptions,
      'Window'
    )
  }
}
