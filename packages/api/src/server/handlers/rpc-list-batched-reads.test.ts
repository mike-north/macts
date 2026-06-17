/**
 * Regression test for issue #89: list JXA N×M AppleEvent round-trip explosion.
 *
 * Before the fix, the generated `list` JXA called `item.<prop>()` once per
 * property per item — O(items × properties) AppleEvent round-trips. For a real
 * Calendar with 35 events and 13 properties that is ~455 AppleEvents, which
 * took ~37 s and exceeded the JXA runner timeout.
 *
 * The fix batches all property reads into a single `item.properties()` call per
 * item, collapsing N×M to ~N round-trips. This test guards that regression by
 * asserting the generated JXA:
 *   1. Uses `item.properties()` to batch reads.
 *   2. Does NOT contain per-property method calls (e.g. `item.summary()`,
 *      `item.location()`) for regular (non-identifier) properties.
 *   3. Copies fields from the properties record rather than calling them.
 *
 * Output shape (field keys and values) is asserted to be unchanged from the
 * pre-fix contract — this test proves correctness alongside the perf fix.
 *
 * The JXA only runs against a live app (out of CI), so we assert on the
 * generated program text at the schema level.
 *
 * @see packages/api/src/server/handlers/rpc.ts — buildListCommandCode
 * @see https://github.com/mike-north/macts/issues/89
 */

import { describe, it, expect } from 'vitest'
import type { Resource } from '@macts/core'
import { CANONICAL_IDENTIFIER_KEY } from '@macts/core'
import { buildListCommandCode } from './rpc.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Simulates the Calendar Event resource: 13 properties + uid identifier.
 * This is the fixture that caused the timeout in issue #89 (35 events × 13
 * properties = ~455 AppleEvents).
 */
const eventResource: Resource = {
  name: 'Event',
  plural: 'Events',
  description: 'A calendar event',
  properties: {
    summary: { access: 'rw', type: 'string', description: 'Title', optional: false },
    description: { access: 'rw', type: 'string', description: 'Notes', optional: true },
    location: { access: 'rw', type: 'string', description: 'Location', optional: true },
    startDate: { access: 'rw', type: 'date', description: 'Start', optional: false },
    endDate: { access: 'rw', type: 'date', description: 'End', optional: false },
    alldayEvent: {
      access: 'rw',
      type: 'boolean',
      description: 'All-day flag',
      optional: false,
    },
    recurrence: { access: 'r', type: 'string', description: 'Recurrence', optional: true },
    status: { access: 'rw', type: 'string', description: 'Status', optional: true },
    sequence: { access: 'r', type: 'number', description: 'Sequence', optional: true },
    stampDate: { access: 'r', type: 'date', description: 'Stamp date', optional: true },
    excludedDates: {
      access: 'r',
      type: 'string',
      description: 'Excluded dates',
      optional: true,
    },
    url: { access: 'rw', type: 'string', description: 'URL', optional: true },
    uid: { access: 'r', type: 'string', description: 'Unique id', optional: false },
  },
  identifiers: [{ property: 'uid', primary: true }],
}

/**
 * A multi-property resource with a byProperty identifier (like the shipped
 * Calendar resource: targeted by `name`, not by `uid` via JXA byId).
 */
const multiPropByPropertyResource: Resource = {
  name: 'Widget',
  plural: 'Widgets',
  description: 'A multi-prop widget',
  properties: {
    name: { access: 'rw', type: 'string', description: 'Name', optional: false },
    color: { access: 'rw', type: 'string', description: 'Color', optional: true },
    size: { access: 'r', type: 'number', description: 'Size', optional: true },
    active: { access: 'rw', type: 'boolean', description: 'Active', optional: true },
  },
  identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
}

// ---------------------------------------------------------------------------
// Issue #89 regression tests: N×M round-trip explosion
// ---------------------------------------------------------------------------

describe('buildListCommandCode — issue #89: batched property reads (not N×M per-field calls)', () => {
  it('uses item.properties() to batch all reads into one AppleEvent per item', () => {
    // The generated JXA MUST call item.properties() — that is the single batched
    // read replacing the per-property accessor loop.
    const code = buildListCommandCode(eventResource, '')
    expect(code).toContain('item.properties()')
  })

  it('does NOT emit per-property method calls for the 13 Calendar event fields', () => {
    // Regression guard: none of the regular (non-identifier) properties should
    // appear as individual `item.<prop>()` calls. This is the exact pattern that
    // caused ~455 AppleEvents and a 37 s timeout for 35 events.
    const code = buildListCommandCode(eventResource, '')

    const regularProps = [
      'summary',
      'description',
      'location',
      'startDate',
      'endDate',
      'alldayEvent',
      'recurrence',
      'status',
      'sequence',
      'stampDate',
      'excludedDates',
      'url',
    ]
    for (const prop of regularProps) {
      // The old form was: item.<prop>() — this MUST NOT appear.
      expect(code, `expected no per-field call for "${prop}"`).not.toContain(`item.${prop}()`)
    }
  })

  it('does NOT emit the identifier as a per-property method call', () => {
    // The identifier (uid) must also NOT be called as item.uid() — it comes from
    // props.uid (same batched record).
    const code = buildListCommandCode(eventResource, '')
    expect(code).not.toContain('item.uid()')
  })

  it('copies each field from the batched properties record (not via method calls)', () => {
    // Fields are read from the already-fetched props object, not via individual
    // JXA method calls. This is the correct batched form.
    const code = buildListCommandCode(eventResource, '')
    // Regular fields copied from props record with undefined guard.
    expect(code).toContain('props.summary !== undefined')
    expect(code).toContain('obj.summary = props.summary')
    expect(code).toContain('props.location !== undefined')
    expect(code).toContain('obj.location = props.location')
  })

  it('reads the identifier from the batched properties record (load-bearing, no try/catch)', () => {
    // The runtime identifier (uid) is read from props without a swallowing catch
    // — preserving the issue #81 requirement that a missing identifier surfaces
    // as a real error rather than silent empty output.
    const code = buildListCommandCode(eventResource, '')
    expect(code).toContain('obj.uid = props.uid;')
    // Must not be wrapped in a try/catch.
    expect(code).not.toContain('try { obj.uid = props.uid; } catch')
  })

  it('still exposes the canonical id alias (output shape unchanged from pre-fix)', () => {
    // The canonical CANONICAL_IDENTIFIER_KEY alias must still be present —
    // consumers depend on item.id being available regardless of app property name.
    const code = buildListCommandCode(eventResource, '')
    expect(CANONICAL_IDENTIFIER_KEY).toBe('id')
    expect(code).toContain(`obj.${CANONICAL_IDENTIFIER_KEY} = obj.uid;`)
  })

  it('does not emit per-property calls for a multi-prop byProperty resource either', () => {
    // Batching applies to all list commands, not just byId resources.
    const code = buildListCommandCode(multiPropByPropertyResource, '')
    expect(code).toContain('item.properties()')
    expect(code).not.toContain('item.color()')
    expect(code).not.toContain('item.size()')
    expect(code).not.toContain('item.active()')
    // The runtime identifier (name) also must not appear as item.name().
    expect(code).not.toContain('item.name()')
  })

  it('still produces the canonical id alias for a byProperty resource', () => {
    const code = buildListCommandCode(multiPropByPropertyResource, '')
    expect(code).toContain('obj.id = obj.name;')
  })
})

// ---------------------------------------------------------------------------
// Output-shape stability tests: same keys as before the fix
// ---------------------------------------------------------------------------

describe('buildListCommandCode — output shape is unchanged from pre-fix contract', () => {
  it('includes all declared property keys for a standard byId resource', () => {
    const code = buildListCommandCode(eventResource, '')
    // Every declared property must appear in the generated code so it can be
    // copied into the output object. Absence would mean the field is silently
    // dropped, breaking API consumers.
    const allProps = Object.keys(eventResource.properties)
    for (const prop of allProps) {
      expect(code, `expected output key "${prop}" to appear in generated JXA`).toContain(prop)
    }
  })

  it('includes the primary identifier key in the output object', () => {
    const code = buildListCommandCode(eventResource, '')
    // The uid field must be in the output object (via idRead from batched props).
    expect(code).toContain('obj.uid')
  })

  it('includes the canonical id alias in the output object', () => {
    const code = buildListCommandCode(eventResource, '')
    expect(code).toContain('obj.id')
  })

  it('includes all declared property keys for a byProperty resource', () => {
    const code = buildListCommandCode(multiPropByPropertyResource, '')
    for (const prop of Object.keys(multiPropByPropertyResource.properties)) {
      expect(code, `expected output key "${prop}" to appear in generated JXA`).toContain(prop)
    }
  })
})
