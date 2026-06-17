/**
 * Tests for identifier population in the server's `list` JXA executor.
 *
 * A live `calendars.list` returned objects with no usable identifier, so there
 * was no way to obtain the id that `events.create`'s `calendarId` (and get /
 * delete) require. These tests assert the generated `list` program reads the
 * manifest-declared primary identifier and exposes it under the canonical `id`
 * key. The JXA itself only runs against a live app (out of CI), so we assert on
 * the generated program text — the live end-to-end run is gated separately
 * (see test/local/calendar-list-create-event.md).
 *
 * Expected property names are derived by hand from the manifest's `identifiers`
 * array, not from program output.
 *
 * @see ../../../../core/src/manifest/identifier.ts (CANONICAL_IDENTIFIER_KEY)
 */

import { describe, it, expect } from 'vitest'
import type { Resource } from '@macts/core'
import { CANONICAL_IDENTIFIER_KEY } from '@macts/core'
import { buildListCommandCode, buildTargetExpression } from './rpc.js'

/** Calendar: identifier declared both as a property and in `identifiers`. */
const calendarResource: Resource = {
  name: 'Calendar',
  plural: 'Calendars',
  description: 'A calendar',
  properties: {
    name: { access: 'rw', type: 'string', description: 'Title', optional: false },
    calendarIdentifier: {
      access: 'r',
      type: 'string',
      description: 'A unique calendar key',
      optional: false,
    },
  },
  identifiers: [{ property: 'calendarIdentifier', primary: true }],
}

/**
 * Calendar fix (#81): identifier targeted byProperty on the runtime-working
 * `name` — matching the shipped manifest, where the primary identifier property
 * IS `name`. `calendarIdentifier` remains an ordinary declared property.
 */
const byPropertyCalendarResource: Resource = {
  name: 'Calendar',
  plural: 'Calendars',
  description: 'A calendar',
  properties: {
    name: { access: 'rw', type: 'string', description: 'Title', optional: false },
    calendarIdentifier: {
      access: 'r',
      type: 'string',
      description: 'A unique calendar key',
      optional: false,
    },
  },
  identifiers: [{ property: 'name', primary: true, targeting: 'byProperty' }],
}

/**
 * A byProperty resource whose declared identifier property differs from the
 * runtime whose-match property (`runtimeProperty`). This is the case where the
 * declared identifier (`calendarIdentifier`) throws at runtime, so it must NOT be
 * read via `item.calendarIdentifier()` — its value is mirrored from the working
 * `name` instead.
 */
const runtimePropertyResource: Resource = {
  name: 'Calendar',
  plural: 'Calendars',
  description: 'A calendar',
  properties: {
    name: { access: 'rw', type: 'string', description: 'Title', optional: false },
    calendarIdentifier: {
      access: 'r',
      type: 'string',
      description: 'A unique calendar key',
      optional: false,
    },
  },
  identifiers: [
    {
      property: 'calendarIdentifier',
      primary: true,
      targeting: 'byProperty',
      runtimeProperty: 'name',
    },
  ],
}

describe('buildListCommandCode — identifier population', () => {
  it('reads the manifest primary identifier property via batched properties()', () => {
    // Issue #89: the list JXA now calls item.properties() once per item (not once
    // per property per item) and reads the identifier from the returned record.
    const code = buildListCommandCode(calendarResource, '')
    // Batched form: identifier read from the properties() record, no per-field call.
    expect(code).toContain('var props = item.properties();')
    expect(code).toContain('obj.calendarIdentifier = props.calendarIdentifier;')
    // Must NOT use the old per-field method-call form (issue #89 regression guard).
    expect(code).not.toContain('item.calendarIdentifier()')
  })

  it('reads the configured identifier WITHOUT a swallowing try/catch', () => {
    // Bug guard (#81): the live `calendars.list` wrapped the identifier read in
    // `try { ... } catch(e) {}`, silently swallowing the runtime failure and
    // leaving items with no usable id and no signal. The identifier read must be
    // emitted unswallowed so a misconfigured identifier surfaces as a real error.
    const code = buildListCommandCode(calendarResource, '')
    expect(code).not.toContain('try { obj.calendarIdentifier = props.calendarIdentifier; } catch')
  })

  it('exposes the identifier under the canonical `id` key', () => {
    const code = buildListCommandCode(calendarResource, '')
    expect(CANONICAL_IDENTIFIER_KEY).toBe('id')
    // The canonical alias mirrors the manifest identifier — single source.
    expect(code).toContain('obj.id = obj.calendarIdentifier;')
  })

  it('sources the canonical id from the runtime property for byProperty resources', () => {
    // For the shipped #81 Calendar fix, the primary identifier property IS the
    // runtime-working `name`, so list reads `name` unswallowed and the canonical
    // `id` mirrors it. With batched reads, `name` comes from props.name.
    const code = buildListCommandCode(byPropertyCalendarResource, '')
    expect(code).toContain('var props = item.properties();')
    expect(code).toContain('obj.name = props.name;')
    expect(code).toContain('obj.id = obj.name;')
    // `name` is the identifier — must not be in a swallowing catch.
    expect(code).not.toContain('try { obj.name = props.name; } catch')
    // Must NOT use old per-field method-call form (issue #89 regression guard).
    expect(code).not.toContain('item.name()')
  })

  it('does NOT call the non-runtime-valid declared identifier accessor (runtimeProperty case)', () => {
    // When the declared identifier (`calendarIdentifier`) throws at runtime and a
    // distinct `runtimeProperty` (`name`) is used, list must NOT emit
    // `item.calendarIdentifier()` — that re-introduces the runtime throw.
    // With batched reads this is naturally avoided: we never call individual
    // property accessors as methods.
    const code = buildListCommandCode(runtimePropertyResource, '')
    expect(code).not.toContain('item.calendarIdentifier()')
    // The working property read flows from props; the canonical id mirrors it.
    expect(code).toContain('obj.name = props.name;')
    expect(code).toContain('obj.id = obj.name;')
  })

  it('mirrors the declared identifier name from the working property (runtimeProperty case)', () => {
    // Consumers that read the declared property name directly still get a value
    // (sourced from the working property), keeping output shape-stable.
    const code = buildListCommandCode(runtimePropertyResource, '')
    expect(code).toContain('obj.calendarIdentifier = obj.name;')
  })

  it('includes the identifier even when it is NOT a declared property', () => {
    // Bug guard: list previously read only `Object.keys(properties)`, so an
    // identifier declared only in `identifiers` was omitted from list output.
    const resourceWithIdOnlyInIdentifiers: Resource = {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar',
      properties: {
        name: { access: 'rw', type: 'string', description: 'Title', optional: false },
      },
      identifiers: [{ property: 'calendarIdentifier', primary: true }],
    }
    const code = buildListCommandCode(resourceWithIdOnlyInIdentifiers, '')
    // Batched: identifier read from props record.
    expect(code).toContain('var props = item.properties();')
    expect(code).toContain('obj.calendarIdentifier = props.calendarIdentifier;')
    expect(code).toContain('obj.id = obj.calendarIdentifier;')
    // Must NOT use old per-field method-call form.
    expect(code).not.toContain('item.calendarIdentifier()')
  })

  it('handles a resource with no identifier gracefully (no canonical alias)', () => {
    // Negative: no identifier declared — list still returns declared props but
    // emits no `id` alias (nothing to mirror), rather than throwing.
    const widget: Resource = {
      name: 'Widget',
      plural: 'Widgets',
      description: 'An identifier-less widget',
      properties: {
        label: { access: 'rw', type: 'string', description: 'Label', optional: false },
      },
    }
    const code = buildListCommandCode(widget, '')
    // Batched: label read from props record, no per-field method call.
    expect(code).toContain('var props = item.properties();')
    expect(code).toContain('props.label !== undefined')
    expect(code).toContain('obj.label = props.label')
    expect(code).not.toContain('obj.id =')
    // Must NOT use old per-field method-call form (issue #89 regression guard).
    expect(code).not.toContain('item.label()')
  })

  it('handles an undefined resource gracefully', () => {
    const code = buildListCommandCode(undefined, '')
    // Falls back to reading `name` from batched properties(); no identifier alias.
    expect(code).toContain('var props = item.properties();')
    expect(code).toContain('props.name !== undefined')
    expect(code).toContain('obj.name = props.name')
    expect(code).not.toContain('obj.id =')
    // Must NOT use old per-field method-call form.
    expect(code).not.toContain('item.name()')
  })
})

describe('buildTargetExpression — identifier targeting strategy', () => {
  it('emits a byId() lookup by default', () => {
    // byId is the default when targeting is unset (e.g. Event with `uid`).
    const event: Resource = {
      name: 'Event',
      plural: 'Events',
      description: 'A calendar event',
      properties: { uid: { access: 'r', type: 'string', description: 'Id', optional: false } },
      identifiers: [{ property: 'uid', primary: true }],
    }
    expect(buildTargetExpression(event, 'events', 'id')).toBe('app.events.byId(id)')
  })

  it('emits a whose({ <property>: <value> })[0] lookup for byProperty', () => {
    // Calendar fix (#81): targeted by name because byId() throws at runtime.
    expect(buildTargetExpression(byPropertyCalendarResource, 'calendars', 'id')).toBe(
      'app.calendars.whose({ name: id })[0]'
    )
  })

  it('uses the explicit runtimeProperty as the whose-match key when provided', () => {
    const resource: Resource = {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar',
      properties: {},
      identifiers: [
        {
          property: 'calendarIdentifier',
          primary: true,
          targeting: 'byProperty',
          runtimeProperty: 'name',
        },
      ],
    }
    expect(buildTargetExpression(resource, 'calendars', 'calendarId')).toBe(
      'app.calendars.whose({ name: calendarId })[0]'
    )
  })

  it('falls back to byId() for a resource with no declared identifier', () => {
    // Negative: no identifier → default byId targeting (callers guard separately).
    const widget: Resource = {
      name: 'Widget',
      plural: 'Widgets',
      description: 'A widget',
      properties: {},
    }
    expect(buildTargetExpression(widget, 'widgets', 'id')).toBe('app.widgets.byId(id)')
    expect(buildTargetExpression(undefined, 'items', 'id')).toBe('app.items.byId(id)')
  })
})
