/**
 * Integration: a color read through the native codec satisfies the generated
 * Calendar contract.
 *
 * The automation bridge reports Calendar's `color` as three fractions in
 * [0, 1]. The real native codec prelude (evaluated in an isolated `node:vm`
 * context, as the automation process would) encodes the Calendar `get`
 * operation's output with that operation's own plan, and the result, after
 * JSON serialization, must pass the operation's `output.wire` schema.
 *
 * The reading is the live one observed for a Calendar calendar; the expected
 * channels are the hand-computed `round(f * 65535)` values.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (A3 colors, D4 native codec)
 */

import { runInNewContext } from 'node:vm'
import { calendarContract } from '@macts/calendar/contract'
import { NATIVE_CODEC, NATIVE_ENCODE_FUNCTION } from '@macts/core'
import type { ValuePlan } from '@macts/contracts'
import { describe, expect, it } from 'vitest'

/** Encodes a native value with the real codec prelude, then JSON round-trips it as the host does. */
function encodeNatively(native: unknown, plan: ValuePlan): unknown {
  const result: unknown = runInNewContext(
    `${NATIVE_CODEC.prelude}\nJSON.stringify(${NATIVE_ENCODE_FUNCTION}(native, plan));`,
    { native, plan }
  )
  if (typeof result !== 'string') throw new Error('Expected serialized codec output')
  return JSON.parse(result)
}

describe('Calendar color through the native codec', () => {
  const get = calendarContract.operations['calendar.calendars.get']
  if (get === undefined) throw new Error('calendar.calendars.get is missing from the contract')

  it('turns the live fraction triple into a wire value the contract accepts', () => {
    const native = {
      name: 'Home',
      title: 'Home',
      color: [0.8234531283378601, 0, 0.884809672832489],
      writable: true,
      description: null,
    }
    const wire = encodeNatively(native, get.output.plan)
    // 65535 * 0.8234531283378601 = 53965.0008 -> 53965; 65535 * 0.884809672832489 = 57986.0019 -> 57986.
    expect(wire).toMatchObject({
      color: { r: { integer: '53965' }, g: { integer: '0' }, b: { integer: '57986' } },
    })
    expect(get.output.wire.safeParse(wire).success).toBe(true)
  })
})
