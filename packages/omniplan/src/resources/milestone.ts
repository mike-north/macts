/**
 * Milestone client for OmniPlan SDK.
 * Auto-generated - do not edit.
 */

import type { Page } from '@macts/contracts'
import type { HttpClient } from '../client.js'
import type { Milestone, MilestoneCreateInput } from '../types.js'

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
 * Client for a milestone (zero-duration marker task).
 */
export class MilestoneResourceClient {
  readonly #http: HttpClient
  readonly #app: string
  readonly #resource: string

  constructor(http: HttpClient, app: string, resource: string) {
    this.#http = http
    this.#app = app
    this.#resource = resource
  }

  /**
   * List all milestones, as one page.
   */
  async list(__mactsOptions?: import('@macts/contracts').CallOptions): Promise<Page<Milestone>> {
    return this.#http.invoke<Page<Milestone>>(
      `${this.#app}.${this.#resource}.list`,
      {},
      __mactsOptions,
      'Milestone'
    )
  }

  /**
   * Get a milestone by id.
   */
  async get(
    id: string | number,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Milestone> {
    return this.#http.invoke<Milestone>(
      `${this.#app}.${this.#resource}.get`,
      { id: __mactsIntegerInput(id) },
      __mactsOptions,
      'Milestone'
    )
  }

  /**
   * Create a new milestone.
   */
  async create(
    input: MilestoneCreateInput,
    __mactsOptions?: import('@macts/contracts').CallOptions
  ): Promise<Milestone> {
    return this.#http.invoke<Milestone>(
      `${this.#app}.${this.#resource}.create`,
      input,
      __mactsOptions,
      'Milestone'
    )
  }
}
