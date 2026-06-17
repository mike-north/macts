/**
 * Regression test for issue #89: list JXA N×M AppleEvent round-trip explosion.
 *
 * Before the fix, the generated `list` JXA called `item.<prop>()` once per
 * property per item — O(items × properties) AppleEvent round-trips. For a real
 * Calendar with 35 events and 13 properties that is ~455 AppleEvents, which
 * took ~37 s and exceeded the JXA runner timeout.
 *
 * The fix uses a hybrid two-path strategy per item:
 *   1. Fast path (try):    item.properties() — ONE AppleEvent per item.
 *                          Fields are copied from the returned record.
 *   2. Fallback (catch):   per-field item.<prop>() calls, each in its own
 *                          try/catch. Used when properties() itself throws
 *                          (e.g. Calendar items: -10000 because calendarIdentifier
 *                          is in the full record and its accessor throws).
 *
 * Tests guard:
 *   a. The fast path exists (item.properties() present; fast-path field writes
 *      use props.<prop>, not item.<prop>()).
 *   b. The fallback path exists (a catch block with per-field item.<prop>() calls).
 *   c. Output shape (field keys) is unchanged from the pre-fix contract.
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
// Issue #89 regression tests: fast path (item.properties())
// ---------------------------------------------------------------------------

describe('buildListCommandCode — issue #89: fast-path batched reads via item.properties()', () => {
  it('uses item.properties() as the fast-path batched read per item', () => {
    // The generated JXA MUST call item.properties() — that is the single batched
    // read in the try branch that replaces N×M round-trips for cooperating items.
    const code = buildListCommandCode(eventResource, '')
    expect(code).toContain('item.properties()')
  })

  it('fast path writes each field from the properties record (not via method calls)', () => {
    // In the try branch, fields are copied from the already-fetched props object.
    // This is the form that gives ~N round-trips instead of N×M.
    const code = buildListCommandCode(eventResource, '')
    // Spot-check two regular fields — they must use the props.<prop> form in the fast path.
    expect(code).toContain('props.summary !== undefined')
    expect(code).toContain('obj.summary = props.summary')
    expect(code).toContain('props.location !== undefined')
    expect(code).toContain('obj.location = props.location')
  })

  it('fast path reads identifier from the batched properties record (load-bearing, no try/catch)', () => {
    // The runtime identifier (uid) is read from props without a swallowing catch
    // in the fast path — preserving the issue #81 requirement that a missing
    // identifier surfaces as a real error rather than silent empty output.
    const code = buildListCommandCode(eventResource, '')
    expect(code).toContain('obj.uid = props.uid;')
    // Must not be wrapped in a try/catch in the fast path.
    expect(code).not.toContain('try { obj.uid = props.uid; } catch')
  })

  it('still exposes the canonical id alias (output shape unchanged from pre-fix)', () => {
    // The canonical CANONICAL_IDENTIFIER_KEY alias must still be present —
    // consumers depend on item.id being available regardless of app property name.
    const code = buildListCommandCode(eventResource, '')
    expect(CANONICAL_IDENTIFIER_KEY).toBe('id')
    expect(code).toContain(`obj.${CANONICAL_IDENTIFIER_KEY} = obj.uid;`)
  })

  it('fast path uses item.properties() for byProperty resources too', () => {
    // Batching applies to all list commands, not just byId resources.
    const code = buildListCommandCode(multiPropByPropertyResource, '')
    expect(code).toContain('item.properties()')
    // Fast-path field writes must use props.<prop> form.
    expect(code).toContain('props.color !== undefined')
    expect(code).toContain('obj.color = props.color')
  })

  it('still produces the canonical id alias for a byProperty resource', () => {
    const code = buildListCommandCode(multiPropByPropertyResource, '')
    expect(code).toContain('obj.id = obj.name;')
  })
})

// ---------------------------------------------------------------------------
// Issue #89 / calendars.list -10000 regression: fallback path required
//
// properties() throws for Calendar items (the calendarIdentifier accessor in
// the full record triggers -10000). The generated JXA MUST include a per-field
// fallback in the catch branch so calendars.list survives that throw.
// ---------------------------------------------------------------------------

describe('buildListCommandCode — calendars.list -10000 regression: per-field fallback in catch', () => {
  it('generated JXA contains a catch block as the fallback for properties() throws', () => {
    // The hybrid try/catch structure must be present. Without the catch branch,
    // any resource whose properties() throws (e.g. Calendar, -10000) would
    // produce an empty obj for every item.
    const code = buildListCommandCode(eventResource, '')
    // The catch block wrapping the fallback must be present.
    expect(code).toContain('} catch(e) {')
  })

  it('fallback branch writes each regular field via individual try/catch per field', () => {
    // In the catch branch, each field is read individually so one throwing field
    // (e.g. calendarIdentifier) cannot abort the remaining fields.
    // This is the form that saved calendars.list before the #89 fast path.
    const code = buildListCommandCode(eventResource, '')
    // Regular fields must appear wrapped in individual try/catch in fallback.
    expect(code).toContain('try { obj.summary = item.summary(); } catch(e) {}')
    expect(code).toContain('try { obj.location = item.location(); } catch(e) {}')
  })

  it('fallback branch reads identifier as item.<id>() — unswallowed', () => {
    // In the fallback catch branch the identifier is read directly from item,
    // not from props (which is not in scope). The read is unswallowed (no
    // try/catch) so a misconfigured identifier still surfaces as an error
    // rather than silent empty output — same #81 semantics as the fast path.
    const code = buildListCommandCode(eventResource, '')
    // The fallback identifier read must be present and bare (no swallowing catch).
    expect(code).toContain('obj.uid = item.uid();')
    expect(code).not.toContain('try { obj.uid = item.uid(); } catch')
  })

  it('fallback branch is present for a byProperty resource too', () => {
    // The catch fallback applies to every list command, not only byId resources.
    const code = buildListCommandCode(multiPropByPropertyResource, '')
    expect(code).toContain('} catch(e) {')
    // Per-field fallback for regular properties.
    expect(code).toContain('try { obj.color = item.color(); } catch(e) {}')
  })

  it('does NOT use the old N×M-only per-field form (no per-field calls at top level outside try/catch)', () => {
    // Regression guard: the fast path must exist (properties() in a try block).
    // If this test fails it means the code regressed to the pure per-field form
    // that caused the 37 s / ~455 AppleEvents timeout for 35 Calendar events.
    const code = buildListCommandCode(eventResource, '')
    expect(code).toContain('try {')
    expect(code).toContain('var props = item.properties();')
    // The fast-path assignment form must be present.
    expect(code).toContain('obj.summary = props.summary')
  })
})

// ---------------------------------------------------------------------------
// Output-shape stability tests: same keys written as before the fix
// ---------------------------------------------------------------------------

describe('buildListCommandCode — output shape is unchanged from pre-fix contract', () => {
  it('writes all declared property keys in the fast path for a standard byId resource', () => {
    const code = buildListCommandCode(eventResource, '')
    // Every declared non-identifier property must be written from props.<prop> in
    // the fast path. Absence means the field would be silently dropped for
    // resources whose properties() succeeds (e.g. events), breaking API consumers.
    const nonIdProps = Object.keys(eventResource.properties).filter((p) => p !== 'uid')
    for (const prop of nonIdProps) {
      // The fast-path write form — not just any substring match.
      expect(code, `expected fast-path write for "${prop}"`).toContain(
        `obj.${prop} = props.${prop}`
      )
    }
  })

  it('writes all declared property keys in the fallback path for a standard byId resource', () => {
    const code = buildListCommandCode(eventResource, '')
    // Every declared non-identifier property must also be written in the fallback
    // branch so that resources whose properties() throws still return complete objects.
    const nonIdProps = Object.keys(eventResource.properties).filter((p) => p !== 'uid')
    for (const prop of nonIdProps) {
      // The per-field fallback write form.
      expect(code, `expected fallback write for "${prop}"`).toContain(
        `try { obj.${prop} = item.${prop}(); } catch(e) {}`
      )
    }
  })

  it('includes the primary identifier key in the output object (fast path)', () => {
    const code = buildListCommandCode(eventResource, '')
    // The uid field must be written from props in the fast path.
    expect(code).toContain('obj.uid = props.uid;')
  })

  it('includes the primary identifier key in the output object (fallback path)', () => {
    const code = buildListCommandCode(eventResource, '')
    // The uid field must be read directly from item in the fallback path.
    expect(code).toContain('obj.uid = item.uid();')
  })

  it('includes the canonical id alias in the output object', () => {
    const code = buildListCommandCode(eventResource, '')
    expect(code).toContain('obj.id')
  })

  it('writes all declared property keys in both paths for a byProperty resource', () => {
    const code = buildListCommandCode(multiPropByPropertyResource, '')
    // The identifier (name) appears as the id read, not in bestEffortProps.
    const nonIdProps = Object.keys(multiPropByPropertyResource.properties).filter(
      (p) => p !== 'name'
    )
    for (const prop of nonIdProps) {
      // Fast path.
      expect(code, `expected fast-path write for "${prop}"`).toContain(
        `obj.${prop} = props.${prop}`
      )
      // Fallback path.
      expect(code, `expected fallback write for "${prop}"`).toContain(
        `try { obj.${prop} = item.${prop}(); } catch(e) {}`
      )
    }
  })
})
