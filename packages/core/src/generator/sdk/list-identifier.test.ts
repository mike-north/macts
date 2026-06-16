/**
 * Tests for canonical-identifier population in the generated HTTP client SDK.
 *
 * When a resource's manifest identifier is NOT literally named `id` (e.g.
 * Calendar's `calendarIdentifier`), the generated read type must additionally
 * surface the value under the canonical `id` key so a consumer of `list()`
 * output can obtain the identifier sibling get/delete/write operations require,
 * without knowing the app-specific property name. Expected field names are
 * derived by hand from the manifest's `identifiers` array, not from output.
 *
 * @see ../../manifest/identifier.ts (CANONICAL_IDENTIFIER_KEY)
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest } from '../../manifest/index.js'
import { CANONICAL_IDENTIFIER_KEY, resolvePrimaryIdentifierProperty } from '../../manifest/index.js'
import { generateHttpClientSdk } from './http-client.js'

function findFile(
  files: { path: string; content: string }[],
  path: string
): { path: string; content: string } {
  const file = files.find((f) => f.path === path)
  if (!file) {
    throw new Error(`Expected file at path "${path}" to exist`)
  }
  return file
}

/** A manifest whose Calendar identifier is `calendarIdentifier` (NOT `id`). */
const calendarManifest: AppManifest = {
  version: '1.0',
  app: { name: 'Calendar', bundleId: 'com.apple.iCal', tccEntitlements: ['calendar'] },
  suites: [],
  relationships: [],
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar containing events',
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
    },
    // Negative case: a resource with NO declared identifier.
    Widget: {
      name: 'Widget',
      plural: 'Widgets',
      description: 'An identifier-less widget',
      properties: {
        label: { access: 'rw', type: 'string', description: 'Label', optional: false },
      },
    },
  },
  enums: {},
  hierarchy: { children: { calendars: { resource: 'Calendar', access: 'rw' } } },
  commands: {
    listCalendars: {
      name: 'list',
      description: 'List calendars',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
      permission: 'calendar:calendars:list',
    },
    listWidgets: {
      name: 'list',
      description: 'List widgets',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [],
      permission: 'calendar:widgets:list',
    },
  },
}

describe('generated read type — canonical identifier population', () => {
  const result = generateHttpClientSdk(calendarManifest, { packageName: '@macts/sdk-calendar' })
  const types = findFile(result.files, 'src/types.ts').content

  it('surfaces the canonical `id` field when the identifier is not named `id`', () => {
    // identifier.ts: canonical key is `id`. Calendar's primary identifier is
    // `calendarIdentifier`, so the read type must expose `id` as well.
    expect(CANONICAL_IDENTIFIER_KEY).toBe('id')
    expect(types).toMatch(/export interface Calendar \{[\s\S]*\bid\?: string;[\s\S]*\}/)
  })

  it('still exposes the app-specific identifier property', () => {
    expect(types).toMatch(/calendarIdentifier: string;/)
  })

  it('does NOT add a canonical `id` field for a resource with no identifier', () => {
    // Negative/graceful: Widget declares no identifier, so no `id` is invented.
    const widgetBlock = /export interface Widget \{[\s\S]*?\}/.exec(types)?.[0] ?? ''
    expect(widgetBlock).toContain('label: string;')
    expect(widgetBlock).not.toMatch(/\bid\?: string;/)
  })

  it('adds the canonical `id` to the runtime Zod schema (optional)', () => {
    expect(types).toMatch(/CalendarSchema = z\.object\(\{[\s\S]*id: z\.string\(\)\.optional\(\)/)
  })
})

/**
 * A manifest whose Calendar identifier is targeted `byProperty` on `name` —
 * matching the shipped fix for issue #81, where the dictionary-declared
 * `calendarIdentifier` is not runtime-valid via JXA. The canonical `id` must
 * mirror the RUNTIME property (`name`), since that is the value get/delete/create
 * accept as the lookup.
 */
const byPropertyCalendarManifest: AppManifest = {
  ...calendarManifest,
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar containing events',
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
    },
  },
  commands: {
    listCalendars: {
      name: 'list',
      description: 'List calendars',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
      permission: 'calendar:calendars:list',
    },
  },
}

describe('generated read type — byProperty identifier mirrors the runtime property', () => {
  const result = generateHttpClientSdk(byPropertyCalendarManifest, {
    packageName: '@macts/sdk-calendar',
  })
  const types = findFile(result.files, 'src/types.ts').content

  it('documents the canonical `id` as mirroring the runtime property `name`', () => {
    // For a byProperty resource the runtime/canonical value is the working
    // property (`name`), NOT the broken declared `calendarIdentifier`.
    expect(types).toContain('mirrors `name`')
    expect(types).not.toContain('mirrors `calendarIdentifier`')
  })

  it('still surfaces the canonical `id` field on the read type', () => {
    expect(types).toMatch(/export interface Calendar \{[\s\S]*\bid\?: string;[\s\S]*\}/)
  })
})

describe('drift guard — list output identifier matches the manifest single source', () => {
  it('the canonical `id` mirrors the resource primary identifier from the manifest', () => {
    // The value the read type aliases to `id` must be the SAME property the
    // manifest declares as the primary identifier — the single source that
    // get/delete/write also resolve from. If these drift, a consumer cannot map
    // a listed item to the id a sibling operation needs.
    const calendar = calendarManifest.resources['Calendar']
    expect(resolvePrimaryIdentifierProperty(calendar)).toBe('calendarIdentifier')

    const result = generateHttpClientSdk(calendarManifest, { packageName: '@macts/sdk-calendar' })
    const types = findFile(result.files, 'src/types.ts').content
    // The generated comment documents which property `id` mirrors — assert the
    // generator wired the canonical alias to the manifest identifier, not a
    // hand-typed name.
    expect(types).toContain('mirrors `calendarIdentifier`')
  })
})
