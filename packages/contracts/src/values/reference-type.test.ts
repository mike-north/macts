/**
 * Unit tests for reference value types, `t.reference(registry, resource,
 * cardinality)`: plans, the lazy resource table, what binders receive, that
 * encoding reads only data, composition into arrays, nullable values, and
 * records (including mutually referencing records), and JSON Schema
 * derivation of the registry-built wire schemas.
 *
 * Round trips for each reference shape live in the codec vectors; these tests
 * pin the constructor's own contract. Expected values are written by hand
 * from the contract.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A6 (References and Hydration)
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (resources is the reference registry)
 * @see phases/13-sdk-value-and-execution-contracts.md §D7 (Reference Hydration Contracts)
 * @see https://zod.dev/json-schema
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { IssuePath } from '../issues.js'
import type { ReferenceData, ReferenceRegistry } from '../references/index.js'
import { Integer } from './integer.js'
import type { CodecResult, DecodeContext, ValueType } from './value-type.js'
import { ValueTypes as t } from './value-types.js'
import type { ValueIssueCode } from './value-issues.js'
import { VECTOR_DECODE_CONTEXT, VECTOR_RESOLVE, sameValueMismatches } from './vectors/index.js'

const REGISTRY: ReferenceRegistry = {
  note: { id: t.string() },
  folder: { id: t.integer() },
  account: { id: t.string() },
}
const registry = (): ReferenceRegistry => REGISTRY

/** A decode context that records the data each binder receives. */
function recordingContext(): { context: DecodeContext; received: ReferenceData[] } {
  const received: ReferenceData[] = []
  return {
    received,
    context: {
      bindReference(data) {
        received.push(data)
        return VECTOR_DECODE_CONTEXT.bindReference(data)
      },
      bindFile() {
        throw new Error('no file binding in reference tests')
      },
    },
  }
}

function valueOf<T>(result: CodecResult<T>): T {
  if (!result.ok) throw new Error(`expected success, got ${JSON.stringify(result.issues)}`)
  return result.value
}

function issuesOf(result: CodecResult<unknown>): { path: IssuePath; code: string | undefined }[] {
  if (result.ok) throw new Error('expected a failure')
  return result.issues.map(({ path, code }) => ({ path, code }))
}

function messagesOf(result: CodecResult<unknown>): string {
  if (result.ok) throw new Error('expected a failure')
  return result.issues.map((entry) => entry.message).join('\n')
}

function expectEncodeIssues(
  type: ValueType<unknown>,
  value: unknown,
  issues: { path: IssuePath; code: ValueIssueCode }[]
): void {
  expect(issuesOf(type.encode(value))).toEqual(issues)
}

function expectDecodeIssues(
  type: ValueType<unknown>,
  wire: unknown,
  issues: { path: IssuePath; code: ValueIssueCode }[]
): void {
  expect(issuesOf(type.decode(wire, VECTOR_DECODE_CONTEXT))).toEqual(issues)
}

/** A registry thunk that counts its calls. */
function countingRegistry(table: ReferenceRegistry = REGISTRY): {
  thunk: () => ReferenceRegistry
  calls: () => number
} {
  let count = 0
  return {
    thunk: () => {
      count += 1
      return table
    },
    calls: () => count,
  }
}

describe('plan', () => {
  it('names the resource and the cardinality', () => {
    expect(t.reference(registry, 'note', 'one').plan).toEqual({
      kind: 'reference',
      resource: 'note',
      cardinality: 'one',
    })
    expect(t.reference(registry, 'folder', 'many').plan).toEqual({
      kind: 'reference',
      resource: 'folder',
      cardinality: 'many',
    })
  })
})

describe('the resource table', () => {
  it('is not read when the value type is constructed, described, or composed', () => {
    const { thunk, calls } = countingRegistry()
    const one = t.reference(thunk, 'note', 'one', { description: 'The note.' })
    const many = t.reference(thunk, 'note', 'many')
    t.array(one)
    t.nullable(many)
    t.record({ note: one, notes: t.optional(many) })
    expect(calls()).toBe(0)
  })

  it('is read when encoding, decoding, and validating', () => {
    const { thunk, calls } = countingRegistry()
    const type = t.reference(thunk, 'note', 'one')
    type.encode({ resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' })
    expect(calls()).toBe(1)
    type.decode(
      { reference: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } },
      VECTOR_DECODE_CONTEXT
    )
    expect(calls()).toBe(2)
    type.wire.safeParse({ reference: {} })
    type.sdk.safeParse({})
    expect(calls()).toBeGreaterThan(2)
  })

  it('reports a declared resource missing from the table as unsupported, in both directions', () => {
    const type = t.reference(registry, 'calendar', 'one')
    expectEncodeIssues(
      type,
      { resource: 'calendar', form: 'identity', cardinality: 'one', id: 'C1' },
      [{ path: [], code: 'unsupported' }]
    )
    expectDecodeIssues(
      type,
      { reference: { resource: 'calendar', form: 'identity', cardinality: 'one', id: 'C1' } },
      [{ path: [], code: 'unsupported' }]
    )
    expect(type.wire.safeParse({ reference: { resource: 'calendar' } }).success).toBe(false)
  })

  it('does not treat inherited object keys as resources', () => {
    const type = t.reference(registry, 'note', 'one')
    expectEncodeIssues(
      type,
      {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        container: { resource: 'toString', form: 'identity', cardinality: 'one', id: 'x' },
      },
      [{ path: ['container'], code: 'unsupported' }]
    )
  })

  it('rejects a malformed composition', () => {
    expect(() => t.reference(REGISTRY as never, 'note', 'one')).toThrow(TypeError)
    expect(() => t.reference(registry, '', 'one')).toThrow(TypeError)
    expect(() => t.reference(registry, 'note', 'some' as never)).toThrow(TypeError)
  })
})

describe('binding', () => {
  it('hands the binder decoded data: integer ids, integer positions, and nested container data', () => {
    const { context, received } = recordingContext()
    const type = t.reference(registry, 'note', 'one')
    valueOf(
      type.decode(
        {
          reference: {
            resource: 'note',
            form: 'selector',
            cardinality: 'one',
            selector: { by: 'index', index: { integer: '3' } },
            container: {
              resource: 'folder',
              form: 'identity',
              cardinality: 'one',
              id: { integer: '7' },
              container: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
            },
          },
        },
        context
      )
    )
    expect(received).toHaveLength(1)
    const [data] = received
    // Plain data, not wire encodings: no `resolve`, ids and positions decoded.
    expect(
      sameValueMismatches(data, {
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: 3 },
        container: {
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: 7,
          container: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
        },
      })
    ).toEqual([])
    if (data?.cardinality !== 'one' || data.form !== 'selector') throw new Error('unexpected data')
    if (data.selector.by !== 'index') throw new Error('unexpected selector')
    expect(Integer.is(data.selector.index)).toBe(true)
    expect(data.container?.form === 'identity' && Integer.is(data.container.id)).toBe(true)
  })

  it('returns exactly what the binder returns', () => {
    const bound = { marker: 'bound' }
    const context: DecodeContext = {
      bindReference: () => bound as never,
      bindFile() {
        throw new Error('no file binding in reference tests')
      },
    }
    const result = t.reference(registry, 'note', 'many').decode(
      {
        reference: {
          resource: 'note',
          form: 'selector',
          cardinality: 'many',
          selector: { by: 'every' },
        },
      },
      context
    )
    expect(valueOf(result)).toBe(bound)
  })

  it('binds once per reference, never for an invalid one', () => {
    const { context, received } = recordingContext()
    t.reference(registry, 'note', 'one').decode(
      { reference: { resource: 'note', form: 'identity', cardinality: 'one', id: 1 } },
      context
    )
    expect(received).toHaveLength(0)
  })
})

describe('encoding', () => {
  const type = t.reference(registry, 'folder', 'one')

  it('never calls resolve or any other live member, and ignores non-data properties', () => {
    const reference = {
      resource: 'folder',
      form: 'identity',
      cardinality: 'one',
      id: Integer.validate(7),
      resolve: () => {
        throw new Error('encode must not resolve')
      },
      refresh: () => {
        throw new Error('encode must not call live members')
      },
      container: {
        resource: 'account',
        form: 'identity',
        cardinality: 'one',
        id: 'A1',
        resolve: () => {
          throw new Error('encode must not resolve a container')
        },
      },
    }
    expect(
      sameValueMismatches(valueOf(type.encode(reference)), {
        reference: {
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: { integer: '7' },
          container: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
        },
      })
    ).toEqual([])
  })

  it('reads data fields of a class-based bound reference, including accessors', () => {
    class BoundFolder {
      readonly resource = 'folder'
      readonly form = 'identity'
      readonly cardinality = 'one'
      get id(): Integer {
        return Integer.validate(9)
      }
      resolve(): Promise<never> {
        throw new Error('encode must not resolve')
      }
    }
    expect(valueOf(type.encode(new BoundFolder()))).toEqual({
      reference: { resource: 'folder', form: 'identity', cardinality: 'one', id: { integer: '9' } },
    })
  })

  it('re-encodes a decoded reference to the canonical wire form', () => {
    const wire = {
      reference: {
        resource: 'folder',
        form: 'identity',
        cardinality: 'one',
        id: { integer: '7' },
        container: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
      },
    }
    const decoded = valueOf(type.decode(wire, VECTOR_DECODE_CONTEXT))
    expect(sameValueMismatches(valueOf(type.encode(decoded)), wire)).toEqual([])
  })

  it('omits an absent container and treats an undefined one as absent', () => {
    const wire = valueOf(
      type.encode({
        resource: 'folder',
        form: 'identity',
        cardinality: 'one',
        id: 7,
        container: undefined,
      })
    )
    expect(
      sameValueMismatches(wire, {
        reference: {
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: { integer: '7' },
        },
      })
    ).toEqual([])
  })

  it('reports every bad entry of an identity collection at its index', () => {
    expectEncodeIssues(
      t.reference(registry, 'note', 'many'),
      {
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [
          { resource: 'note', form: 'identity', cardinality: 'one', id: 1 },
          { resource: 'note', form: 'identity', cardinality: 'one', id: 'N2' },
          { resource: 'note', form: 'identity', cardinality: 'many', entries: [] },
        ],
      },
      [
        { path: ['entries', 0, 'id'], code: 'invalid-type' },
        { path: ['entries', 2], code: 'invalid-type' },
      ]
    )
  })

  it('names the declared and received resources when they differ', () => {
    const message = messagesOf(
      type.encode({ resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' })
    )
    expect(message).toContain('"folder"')
    expect(message).toContain('"note"')
  })

  it.each([
    ['a string', 'folder:7', [{ path: [], code: 'invalid-type' }]],
    ['null', null, [{ path: [], code: 'not-nullable' }]],
    ['an array', [], [{ path: [], code: 'invalid-type' }]],
    [
      'no resource',
      { form: 'identity', cardinality: 'one', id: 7 },
      [{ path: ['resource'], code: 'missing-field' }],
    ],
    [
      'an unknown form',
      { resource: 'folder', form: 'query', cardinality: 'one' },
      [{ path: ['form'], code: 'unknown-enum-member' }],
    ],
    [
      'an identity reference with no id',
      { resource: 'folder', form: 'identity', cardinality: 'one' },
      [{ path: ['id'], code: 'missing-field' }],
    ],
    [
      'a collection selector at a single-object position',
      { resource: 'folder', form: 'selector', cardinality: 'one', selector: { by: 'every' } },
      [{ path: ['selector', 'by'], code: 'unknown-enum-member' }],
    ],
    [
      'a name selector with no name',
      { resource: 'folder', form: 'selector', cardinality: 'one', selector: { by: 'name' } },
      [{ path: ['selector', 'name'], code: 'missing-field' }],
    ],
    [
      'a container with a wrong id type',
      {
        resource: 'folder',
        form: 'identity',
        cardinality: 'one',
        id: 7,
        container: { resource: 'account', form: 'identity', cardinality: 'one', id: 1 },
      },
      [{ path: ['container', 'id'], code: 'invalid-type' }],
    ],
  ] as const)('rejects %s', (_label, value, issues) => {
    expectEncodeIssues(type, value, [...issues])
  })
})

describe('decoding', () => {
  const type = t.reference(registry, 'note', 'one')

  it.each([
    [
      'a bare reference payload without its envelope',
      { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' },
      [{ path: [], code: 'invalid-control-record' }],
    ],
    [
      'an extra key beside the envelope',
      { reference: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' }, x: 1 },
      [{ path: [], code: 'invalid-control-record' }],
    ],
    [
      'an undeclared key in a selector',
      {
        reference: {
          resource: 'note',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'name', name: 'Inbox', caseSensitive: true },
        },
      },
      [{ path: ['selector', 'caseSensitive'], code: 'unknown-field' }],
    ],
    [
      'a bare number index',
      {
        reference: {
          resource: 'note',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: 0 },
        },
      },
      [{ path: ['selector', 'index'], code: 'invalid-type' }],
    ],
    [
      'a null container',
      {
        reference: {
          resource: 'note',
          form: 'identity',
          cardinality: 'one',
          id: 'N1',
          container: null,
        },
      },
      [{ path: ['container'], code: 'not-nullable' }],
    ],
    [
      'an identity collection with a container',
      {
        reference: {
          resource: 'note',
          form: 'identity',
          cardinality: 'one',
          id: 'N1',
          container: {
            resource: 'folder',
            form: 'identity',
            cardinality: 'many',
            entries: [],
          },
        },
      },
      [{ path: ['container'], code: 'invalid-type' }],
    ],
  ] as const)('rejects %s', (_label, wire, issues) => {
    expectDecodeIssues(type, wire, [...issues])
  })

  it('rejects an undeclared key on an identity collection, which has no container', () => {
    expectDecodeIssues(
      t.reference(registry, 'note', 'many'),
      {
        reference: {
          resource: 'note',
          form: 'identity',
          cardinality: 'many',
          entries: [],
          container: {
            resource: 'folder',
            form: 'identity',
            cardinality: 'one',
            id: { integer: '1' },
          },
        },
      },
      [{ path: ['container'], code: 'unknown-field' }]
    )
  })

  it('accepts an empty identity collection', () => {
    const wire = {
      reference: { resource: 'note', form: 'identity', cardinality: 'many', entries: [] },
    }
    const decoded = valueOf(
      t.reference(registry, 'note', 'many').decode(wire, VECTOR_DECODE_CONTEXT)
    )
    expect(
      sameValueMismatches(decoded, {
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [],
        resolve: VECTOR_RESOLVE,
      })
    ).toEqual([])
  })
})

describe('composition', () => {
  const note = t.reference(registry, 'note', 'one')
  const identity = { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } as const
  const selector = {
    resource: 'note',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'Inbox' },
  } as const

  it('makes a materialized reference list with t.array, mixing forms', () => {
    const list = t.array(note)
    expect(list.plan).toEqual({
      kind: 'array',
      items: { kind: 'reference', resource: 'note', cardinality: 'one' },
    })
    const wire = [{ reference: identity }, { reference: selector }]
    expect(sameValueMismatches(valueOf(list.encode([identity, selector])), wire)).toEqual([])
    expect(
      sameValueMismatches(valueOf(list.decode(wire, VECTOR_DECODE_CONTEXT)), [
        { ...identity, resolve: VECTOR_RESOLVE },
        { ...selector, resolve: VECTOR_RESOLVE },
      ])
    ).toEqual([])
    expect(issuesOf(list.encode([identity, { ...identity, cardinality: 'many' }]))).toEqual([
      { path: [1], code: 'invalid-type' },
    ])
  })

  it('composes with nullable and optional record fields', () => {
    const owner = t.record({
      primary: t.nullable(note),
      secondary: t.optional(note),
    })
    expect(valueOf(owner.encode({ primary: null }))).toEqual({ primary: null })
    expect(valueOf(owner.encode({ primary: identity, secondary: selector }))).toEqual({
      primary: { reference: identity },
      secondary: { reference: selector },
    })
    const decoded = valueOf(owner.decode({ primary: null }, VECTOR_DECODE_CONTEXT))
    expect(Object.hasOwn(decoded, 'secondary')).toBe(false)
    expect(
      issuesOf(owner.encode({ primary: identity, secondary: { ...identity, id: 3 } }))
    ).toEqual([{ path: ['secondary', 'id'], code: 'invalid-type' }])
  })

  it('composes mutually referencing records through the lazy table', () => {
    const table: Record<
      string,
      { readonly id: ValueType<unknown>; readonly record: ValueType<unknown> }
    > = {}
    const resources = (): ReferenceRegistry => table
    const noteRecord = t.record({
      title: t.string(),
      folder: t.reference(resources, 'folder', 'one'),
    })
    const folderRecord = t.record({
      name: t.string(),
      notes: t.array(t.reference(resources, 'note', 'one')),
      parent: t.optional(t.reference(resources, 'folder', 'one')),
    })
    table['note'] = { id: t.string(), record: noteRecord }
    table['folder'] = { id: t.integer(), record: folderRecord }

    const folder = {
      name: 'Inbox',
      notes: [{ resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' }],
      parent: { resource: 'folder', form: 'identity', cardinality: 'one', id: 1 },
    }
    const wire = {
      name: 'Inbox',
      notes: [{ reference: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } }],
      parent: {
        reference: {
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: { integer: '1' },
        },
      },
    }
    expect(sameValueMismatches(valueOf(folderRecord.encode(folder)), wire)).toEqual([])
    expect(folderRecord.wire.safeParse(wire).success).toBe(true)
    expect(
      valueOf(
        noteRecord.encode({
          title: 'Groceries',
          folder: { resource: 'folder', form: 'identity', cardinality: 'one', id: 2 },
        })
      )
    ).toEqual({
      title: 'Groceries',
      folder: {
        reference: {
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: { integer: '2' },
        },
      },
    })
    expect(() => z.toJSONSchema(noteRecord.wire, { target: 'draft-7' })).not.toThrow()
    expect(() => z.toJSONSchema(folderRecord.wire, { target: 'draft-7' })).not.toThrow()
  })
})

describe('schemas', () => {
  const note = t.reference(registry, 'note', 'one')
  const notes = t.reference(registry, 'note', 'many')

  it('have wire schemas that convert to draft-7 JSON Schema', () => {
    for (const type of [note, notes, t.reference(registry, 'folder', 'one')]) {
      const schema = z.toJSONSchema(type.wire, { target: 'draft-7' }) as Record<string, unknown>
      expect(schema['type']).toBe('object')
      expect(schema['required']).toEqual(['reference'])
      expect(schema['additionalProperties']).toBe(false)
    }
  })

  it('validate container ids against the container resource on the wire', () => {
    const withContainer = (id: unknown) => ({
      reference: {
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        container: { resource: 'folder', form: 'identity', cardinality: 'one', id },
      },
    })
    expect(note.wire.safeParse(withContainer({ integer: '7' })).success).toBe(true)
    expect(note.wire.safeParse(withContainer('7')).success).toBe(false)
    expect(note.wire.safeParse(withContainer({ integer: '007' })).success).toBe(false)
  })

  it('have SDK schemas that accept bound references and reject what encoding rejects', () => {
    const bound = {
      resource: 'note',
      form: 'identity',
      cardinality: 'one',
      id: 'N1',
      resolve: VECTOR_RESOLVE,
    }
    expect(note.sdk.safeParse(bound).success).toBe(true)
    expect(note.sdk.safeParse({ ...bound, id: 1 }).success).toBe(false)
    expect(notes.sdk.safeParse(bound).success).toBe(false)
    expect(
      notes.sdk.safeParse({
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: 2, end: 2 },
      }).success
    ).toBe(true)
  })

  it('carry a description to both schemas', () => {
    const described = t.reference(registry, 'note', 'one', { description: 'The note.' })
    expect(described.sdk.description).toBe('The note.')
    expect(described.wire.description).toBe('The note.')
  })

  it('are frozen with a JSON-serializable plan', () => {
    expect(Object.isFrozen(note)).toBe(true)
    expect(Object.isFrozen(note.plan)).toBe(true)
    expect(JSON.parse(JSON.stringify(note.plan))).toEqual(note.plan)
  })
})

describe('user-facing messages', () => {
  it('never mention the native automation layer', () => {
    const type = t.reference(registry, 'note', 'many')
    const results = [
      type.encode({
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: 3, end: 1 },
      }),
      type.encode({ resource: 'calendar', form: 'identity', cardinality: 'many', entries: [] }),
      type.decode(
        { reference: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } },
        VECTOR_DECODE_CONTEXT
      ),
    ]
    for (const result of results) {
      expect(messagesOf(result)).not.toMatch(/applescript|jxa|osascript/i)
    }
  })

  it('explains that an equal start and end is a valid empty range', () => {
    const message = messagesOf(
      t.reference(registry, 'note', 'many').encode({
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: 3, end: 1 },
      })
    )
    expect(message).toContain('start (3) must not exceed its end (1)')
    expect(message).toMatch(/half-open/)
  })
})
