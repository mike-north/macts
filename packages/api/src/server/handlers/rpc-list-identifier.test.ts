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
import { buildListCommandCode } from './rpc.js'

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

describe('buildListCommandCode — identifier population', () => {
  it('reads the manifest primary identifier property', () => {
    const code = buildListCommandCode(calendarResource, '')
    // The executor must read `calendarIdentifier()` so the value is in output.
    expect(code).toContain('obj.calendarIdentifier = item.calendarIdentifier();')
  })

  it('exposes the identifier under the canonical `id` key', () => {
    const code = buildListCommandCode(calendarResource, '')
    expect(CANONICAL_IDENTIFIER_KEY).toBe('id')
    // The canonical alias mirrors the manifest identifier — single source.
    expect(code).toContain('obj.id = obj.calendarIdentifier;')
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
    expect(code).toContain('obj.calendarIdentifier = item.calendarIdentifier();')
    expect(code).toContain('obj.id = obj.calendarIdentifier;')
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
    expect(code).toContain('obj.label = item.label();')
    expect(code).not.toContain('obj.id =')
  })

  it('handles an undefined resource gracefully', () => {
    const code = buildListCommandCode(undefined, '')
    // Falls back to reading `name`; no identifier alias.
    expect(code).toContain('obj.name = item.name();')
    expect(code).not.toContain('obj.id =')
  })
})
