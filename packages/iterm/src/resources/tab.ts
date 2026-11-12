/**
 * Tab client for iTerm SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Tab } from '../types.js'

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
 * Client for a terminal tab.
 */
export class TabResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the tabs of one window, as one page.
   */
  async list(
    windowId: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Tab>> {
    return this.#http.invoke<Page<Tab>>(
      `${this.#app}.${this.#resource}.list`,
      { windowId: __mactsIntegerInput(windowId) },
      __mactsOptions,
      'Tab'
    )
  }

  /**
   * Get a tab by index within a parent scope.
   * A tab has no id, so it is selected by its zero-based position within its window, which drifts when tabs open, close or move.
   */
  async get(
    windowId: string | number,
    index: string | number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Tab> {
    return this.#http.invoke<Tab>(
      `${this.#app}.${this.#resource}.get`,
      { windowId: __mactsIntegerInput(windowId), index: __mactsIntegerInput(index) },
      __mactsOptions,
      'Tab'
    )
  }
}
