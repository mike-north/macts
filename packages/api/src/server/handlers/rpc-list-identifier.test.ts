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
  it('reads the manifest primary identifier property via the fast-path properties() record', () => {
    // Issue #89: the list JXA now attempts item.properties() (fast path) and
    // reads the identifier from the returned record. A per-field fallback is also
    // emitted in the catch branch for resources whose properties() call throws.
    const code = buildListCommandCode(calendarResource, '')
    // Fast path: properties() call must be present (inside the try block).
    expect(code).toContain('item.properties()')
    // Fast-path identifier read: from the props record.
    expect(code).toContain('obj.calendarIdentifier = props.calendarIdentifier;')
    // Fallback identifier read: from item directly (catch branch).
    expect(code).toContain('obj.calendarIdentifier = item.calendarIdentifier();')
  })

  it('reads the configured identifier WITHOUT a swallowing try/catch in the fast path', () => {
    // Bug guard (#81): the identifier read must be emitted unswallowed so a
    // misconfigured identifier surfaces as a real error rather than silent empty output.
    // This applies to the fast-path read from props (not wrapped in try/catch).
    const code = buildListCommandCode(calendarResource, '')
    expect(code).not.toContain('try { obj.calendarIdentifier = props.calendarIdentifier; } catch')
  })

  it('reads the configured identifier WITHOUT a swallowing try/catch in the fallback path', () => {
    // Same #81 guard for the fallback path: the per-field fallback identifier
    // read (item.calendarIdentifier()) must also be unswallowed.
    const code = buildListCommandCode(calendarResource, '')
    expect(code).not.toContain('try { obj.calendarIdentifier = item.calendarIdentifier(); } catch')
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
    // `id` mirrors it. In the fast path `name` comes from props.name; in the
    // fallback it is read directly as item.name().
    const code = buildListCommandCode(byPropertyCalendarResource, '')
    // Fast path: properties() present and identifier from props.
    expect(code).toContain('item.properties()')
    expect(code).toContain('obj.name = props.name;')
    expect(code).toContain('obj.id = obj.name;')
    // Fast-path identifier must not be in a swallowing catch.
    expect(code).not.toContain('try { obj.name = props.name; } catch')
    // Fallback path: identifier read directly from item, also unswallowed.
    expect(code).toContain('obj.name = item.name();')
    expect(code).not.toContain('try { obj.name = item.name(); } catch')
  })

  it('does NOT call the non-runtime-valid declared identifier accessor in a per-field loop (runtimeProperty case)', () => {
    // When the declared identifier (`calendarIdentifier`) throws at runtime and a
    // distinct `runtimeProperty` (`name`) is used, `calendarIdentifier` must be
    // listed in skipPropertyRead — it must NOT appear in the per-field fallback
    // loop as a swallowed try/catch accessor, because that re-introduces the throw
    // in a confusing way. The value is instead mirrored from the working property.
    const code = buildListCommandCode(runtimePropertyResource, '')
    // The per-field fallback must NOT contain a swallowed read of calendarIdentifier.
    expect(code).not.toContain('try { obj.calendarIdentifier = item.calendarIdentifier(); } catch')
    // The working property read (fast path) and canonical id alias must still be present.
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
    // Fast path: properties() call present; identifier read from props record.
    expect(code).toContain('item.properties()')
    expect(code).toContain('obj.calendarIdentifier = props.calendarIdentifier;')
    expect(code).toContain('obj.id = obj.calendarIdentifier;')
    // Fallback path: identifier read directly from item (in catch branch).
    expect(code).toContain('obj.calendarIdentifier = item.calendarIdentifier();')
    // Must NOT be in a per-field swallowed loop (identifier reads are unswallowed).
    expect(code).not.toContain('try { obj.calendarIdentifier = item.calendarIdentifier(); } catch')
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
    // Fast path: properties() present; label written from props record.
    expect(code).toContain('item.properties()')
    expect(code).toContain('props.label !== undefined')
    expect(code).toContain('obj.label = props.label')
    // Fallback path: label read per-field in catch branch.
    expect(code).toContain('try { obj.label = item.label(); } catch(e) {}')
    expect(code).not.toContain('obj.id =')
  })

  it('handles an undefined resource gracefully', () => {
    const code = buildListCommandCode(undefined, '')
    // Fast path: properties() present; name written from props record.
    expect(code).toContain('item.properties()')
    expect(code).toContain('props.name !== undefined')
    expect(code).toContain('obj.name = props.name')
    // Fallback path: name read per-field in catch branch.
    expect(code).toContain('try { obj.name = item.name(); } catch(e) {}')
    expect(code).not.toContain('obj.id =')
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
