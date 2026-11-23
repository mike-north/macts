/**
 * Session client for iTerm SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Session } from '../types.js'

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
 * Client for a terminal session.
 */
export class SessionResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the sessions of one tab, as one page.
   */
  async list(
    windowId: number,
    tabIndex: number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Session>> {
    return this.#http.invoke<Page<Session>>(
      `${this.#app}.${this.#resource}.list`,
      { windowId: __mactsIntegerInput(windowId), tabIndex: __mactsIntegerInput(tabIndex) },
      __mactsOptions,
      'Session'
    )
  }

  /**
   * Read a session by id in the tab at a window position.
   */
  async get(
    windowId: string | number,
    tabIndex: string | number,
    sessionId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Session> {
    return this.#http.invoke<Session>(
      `${this.#app}.${this.#resource}.getWithinTab`,
      {
        windowId: __mactsIntegerInput(windowId),
        tabIndex: __mactsIntegerInput(tabIndex),
        sessionId,
      },
      __mactsOptions,
      'Session'
    )
  }

  /**
   * Read a session identity across all tabs of its Window. A move to another Window makes this identity missing.
   */
  async resolve(
    windowId: string | number,
    sessionId: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Session> {
    return this.#http.invoke<Session>(
      `${this.#app}.${this.#resource}.resolve`,
      { windowId: __mactsIntegerInput(windowId), sessionId },
      __mactsOptions,
      'Session'
    )
  }

  /**
   * Write text into a session, as though it was typed, optionally followed by a newline.
   */
  async write(
    windowId: number,
    sessionId: string,
    text: string,
    newline?: boolean,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.writeText`,
      { windowId: __mactsIntegerInput(windowId), sessionId, text, newline },
      __mactsOptions,
      'Session'
    )
  }
}
