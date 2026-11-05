/**
 * Reminder client for Reminders SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Reminder, ReminderCreateInput } from '../types.js'

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
 * Client for a reminder item.
 */
export class ReminderResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List the reminders of one list, one page at a time. When the result has a `nextCursor`,
   * more remain: call again with the same arguments and `{ cursor: nextCursor }`.
   */
  async list(
    listId: string,
    page: { pageSize?: number; cursor?: string } = {},
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Page<Reminder>> {
    return this.#http.invoke<Page<Reminder>>(
      `${this.#app}.${this.#resource}.list`,
      {
        ...(page.pageSize === undefined ? {} : { pageSize: __mactsIntegerInput(page.pageSize) }),
        ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
        listId,
      },
      __mactsOptions,
      'Reminder'
    )
  }

  /**
   * Get a reminder by id.
   */
  async get(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Reminder> {
    return this.#http.invoke<Reminder>(
      `${this.#app}.${this.#resource}.get`,
      { id },
      __mactsOptions,
      'Reminder'
    )
  }

  /**
   * Create a new reminder.
   */
  async create(
    input: ReminderCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Reminder> {
    return this.#http.invoke<Reminder>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Reminder'
    )
  }

  /**
   * Delete an reminder.
   */
  async delete(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.delete`,
      { id },
      __mactsOptions,
      'Reminder'
    )
  }

  /**
   * Mark a reminder as complete
   */
  async complete(
    id: string,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.complete`,
      { id },
      __mactsOptions,
      'Reminder'
    )
  }

  /**
   * Show the reminder in Reminders.app UI
   */
  async show(id: string, __mactsOptions?: import('@macts/contracts').CallOptions): Promise<void> {
    await this.#http.invoke<undefined>(
      `${this.#app}.${this.#resource}.show`,
      { id },
      __mactsOptions,
      'Reminder'
    )
  }
}
