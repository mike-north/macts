/**
 * Tests for the manifest-level rule that a usable declaration's type may not
 * name a resource marked unsupported: no generated surface declares such a
 * resource, so the type would refer to nothing.
 *
 * Expected outcomes are derived by hand from the rule in
 * `phases/13-sdk-value-and-execution-contracts.md` (D10, unsupported
 * resources) and the type-name matching of `../type-names.ts`: a name matches
 * a resource's key, name or plural in any case and without spaces, dashes or
 * underscores; a bare name or an `{ enum }` that names an enum is that enum;
 * an `{ array }` names what its item names. The fixture's Speaker is usable,
 * and Connection is marked unsupported in the marked variant only.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md
 * @see https://github.com/mike-north/macts/issues/165
 */

import { describe, expect, it } from 'vitest'
import { AppManifestSchema } from './app.js'

/** Screen Sharing 7.1's dictionary, which declares no connection class. */
const CONNECTION_MARK = {
  evidence: {
    source: 'dictionary',
    bundleId: 'com.example.viewer',
    appVersion: '7.1',
    osVersion: '27.2',
    term: 'connection',
    finding: 'no-class',
  },
} as const

const LIVE_MARK = {
  evidence: {
    source: 'live',
    observedAt: '2026-11-01T16:34:20.000Z',
    bundleId: 'com.example.viewer',
    appVersion: '7.1',
    osVersion: '27.2',
    expression: 'the connections collection at the application',
    errorNumber: -1728,
  },
} as const

interface Fixture {
  readonly speakerProperties?: Record<string, unknown>
  readonly connectionProperties?: Record<string, unknown>
  readonly commands?: Record<string, unknown>
  readonly enums?: Record<string, unknown>
}

/** A Viewer manifest with Speaker and Connection, Connection marked when `marked`. */
function viewer(marked: boolean, fixture: Fixture = {}): unknown {
  return {
    version: '1.0',
    app: { name: 'Viewer', bundleId: 'com.example.viewer' },
    resources: {
      Speaker: {
        name: 'Speaker',
        plural: 'Speakers',
        description: 'A speaker',
        properties: {
          name: { access: 'r', type: 'string', description: 'The name' },
          ...fixture.speakerProperties,
        },
      },
      Connection: {
        name: 'Connection',
        plural: 'Connections',
        description: 'A connection',
        properties: { ...fixture.connectionProperties },
        ...(marked ? { unsupported: CONNECTION_MARK } : {}),
      },
    },
    enums: fixture.enums ?? {},
    hierarchy: { children: {} },
    commands: fixture.commands ?? {},
  }
}

/** Each issue a failed parse reports, as its path and message. */
function issues(input: unknown): { path: PropertyKey[]; message: string }[] {
  const result = AppManifestSchema.safeParse(input)
  return result.success
    ? []
    : result.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
}

const property = (type: unknown): Record<string, unknown> => ({
  access: 'r',
  type,
  description: 'A reference',
})

const command = (fields: Record<string, unknown>): Record<string, unknown> => ({
  name: 'open',
  description: 'Open something',
  scope: 'application',
  ...fields,
})

describe('a usable type naming a resource marked unsupported', () => {
  it('rejects a property, naming the property and the resource', () => {
    const fixture = { speakerProperties: { current: property({ resource: 'Connection' }) } }
    expect(issues(viewer(true, fixture))).toEqual([
      {
        path: ['resources', 'Speaker', 'properties', 'current', 'type'],
        message: expect.stringMatching(
          /^resources\.Speaker\.properties\.current: .*"Connection".*mark the property unsupported/
        ) as unknown as string,
      },
    ])
    // The same fixture without the marker is valid: Connection is declared.
    expect(issues(viewer(false, fixture))).toEqual([])
  })

  it('rejects a command parameter, naming the parameter and the resource', () => {
    // A bare name matches the resource's name.
    const fixture = {
      commands: {
        open: command({ parameters: [{ name: 'target', type: 'Connection', description: 'x' }] }),
      },
    }
    const found = issues(viewer(true, fixture))
    expect(found.map((issue) => issue.path)).toEqual([
      ['commands', 'open', 'parameters', 0, 'type'],
    ])
    expect(found[0]?.message).toMatch(/^commands\.open\.parameters\.target: .*"Connection"/)
    expect(found[0]?.message).toMatch(/mark the command unsupported/)
    expect(issues(viewer(false, fixture))).toEqual([])
  })

  it('rejects a command result, matched by plural in any case', () => {
    // "connections" is Connection's plural, lowercased.
    const fixture = { commands: { open: command({ returns: 'connections' }) } }
    const found = issues(viewer(true, fixture))
    expect(found.map((issue) => issue.path)).toEqual([['commands', 'open', 'returns']])
    expect(found[0]?.message).toMatch(/^commands\.open\.returns: .*"Connection"/)
    expect(issues(viewer(false, fixture))).toEqual([])
  })

  it('rejects an array whose item names the resource', () => {
    const fixture = {
      speakerProperties: { history: property({ array: { resource: 'connection' } }) },
    }
    expect(issues(viewer(true, fixture)).map((issue) => issue.path)).toEqual([
      ['resources', 'Speaker', 'properties', 'history', 'type'],
    ])
    expect(issues(viewer(false, fixture))).toEqual([])
  })

  it('reports every offending site', () => {
    const fixture = {
      speakerProperties: { current: property({ resource: 'Connection' }) },
      commands: { open: command({ returns: 'Connection' }) },
    }
    expect(issues(viewer(true, fixture)).map((issue) => issue.path)).toEqual([
      ['resources', 'Speaker', 'properties', 'current', 'type'],
      ['commands', 'open', 'returns'],
    ])
  })
})

describe('a type naming a resource marked unsupported that no surface exposes', () => {
  it('accepts it on a property marked unsupported', () => {
    const marked = {
      ...property({ resource: 'Connection' }),
      unsupported: {
        reason: 'The app does not implement this property.',
        evidence: {
          source: 'probe',
          observedAt: '2026-11-01T06:05:32.244Z',
          bundleId: 'com.example.viewer',
          appVersion: '7.1',
          osVersion: '27.2',
          sampleSize: 3,
          failedReads: 3,
          errorNumbers: [-1728],
        },
      },
    }
    expect(issues(viewer(true, { speakerProperties: { current: marked } }))).toEqual([])
  })

  it('accepts it on a command marked unsupported', () => {
    const fixture = {
      commands: { open: command({ returns: 'Connection', unsupported: LIVE_MARK }) },
    }
    expect(issues(viewer(true, fixture))).toEqual([])
  })

  it('accepts it on a property of the marked resource itself', () => {
    const fixture = { connectionProperties: { peer: property({ resource: 'Connection' }) } }
    expect(issues(viewer(true, fixture))).toEqual([])
  })
})

describe('a type that names something else', () => {
  it('accepts a bare name or enum reference that names an enum of the same name', () => {
    // A bare name (allowed for a command's parameters and result) and
    // `{ enum }` try enums first, so both name the enum.
    const fixture = {
      enums: { Connection: { name: 'Connection', values: [{ name: 'wired', value: 'wired' }] } },
      speakerProperties: { mode: property({ enum: 'Connection' }) },
      commands: {
        open: command({
          parameters: [{ name: 'kind', type: 'Connection', description: 'x' }],
          returns: 'Connection',
        }),
      },
    }
    expect(issues(viewer(true, fixture))).toEqual([])
  })

  it('still rejects a resource reference when an enum shares the name', () => {
    // `{ resource }` names a resource, so it names the marked one; an enum of
    // the same name does not change what the declaration meant.
    const fixture = {
      enums: { Connection: { name: 'Connection', values: [{ name: 'wired', value: 'wired' }] } },
      speakerProperties: { current: property({ resource: 'Connection' }) },
    }
    expect(issues(viewer(true, fixture)).map((issue) => issue.path)).toEqual([
      ['resources', 'Speaker', 'properties', 'current', 'type'],
    ])
  })

  it('accepts a primitive type, and a reference to a usable resource', () => {
    const fixture = {
      speakerProperties: { label: property('string'), peer: property({ resource: 'Speaker' }) },
    }
    expect(issues(viewer(true, fixture))).toEqual([])
  })
})
