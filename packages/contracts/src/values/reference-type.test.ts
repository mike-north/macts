/**
 * Unit tests for reference value types, `t.reference(scope, resource,
 * cardinality)`: plans, the lazy scope, the app every reference carries, what
 * binders receive, that encoding reads only data, composition into arrays,
 * nullable values, and records (including mutually referencing records), and
 * JSON Schema derivation of the wire schemas built from the resource table.
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
import type { ReferenceData, ReferenceRegistry, ReferenceScope } from '../references/index.js'
import { Integer } from './integer.js'
import type { CodecResult, DecodeContext, ValueType } from './value-type.js'
import { ValueTypes as t } from './value-types.js'
import type { ValueIssueCode } from './value-issues.js'
import { VECTOR_DECODE_CONTEXT, VECTOR_RESOLVE, sameValueMismatches } from './vectors/index.js'

/** The app the references in these tests belong to. */
const APP = 'notes'

/**
 * Every resource can be got and listed, so references to it and containers
 * of it can be resolved; the resolvability tests use their own tables.
 */
const REGISTRY: ReferenceRegistry = {
  note: { id: t.string(), get: 'notes.notes.get', list: 'notes.notes.list' },
  folder: { id: t.integer(), get: 'notes.folders.get', list: 'notes.folders.list' },
  account: { id: t.string(), get: 'notes.accounts.get', list: 'notes.accounts.list' },
}

/** The scope of an app named {@link APP} with the given resource table. */
function scopeOf(resources: ReferenceRegistry): ReferenceScope {
  return { app: APP, resources }
}

const SCOPE = scopeOf(REGISTRY)
const registry = (): ReferenceScope => SCOPE

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

/** A scope thunk that counts its calls. */
function countingScope(scope: ReferenceScope = SCOPE): {
  thunk: () => ReferenceScope
  calls: () => number
} {
  let count = 0
  return {
    thunk: () => {
      count += 1
      return scope
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
    const { thunk, calls } = countingScope()
    const one = t.reference(thunk, 'note', 'one', { description: 'The note.' })
    const many = t.reference(thunk, 'note', 'many')
    t.array(one)
    t.nullable(many)
    t.record({ note: one, notes: t.optional(many) })
    expect(calls()).toBe(0)
  })

  it('is read when encoding, decoding, and validating', () => {
    const { thunk, calls } = countingScope()
    const type = t.reference(thunk, 'note', 'one')
    type.encode({ app: APP, resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' })
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
      { app: APP, resource: 'calendar', form: 'identity', cardinality: 'one', id: 'C1' },
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
        app: APP,
        resource: 'note',
        form: 'identity',
        cardinality: 'one',
        id: 'N1',
        container: {
          app: APP,
          resource: 'toString',
          form: 'identity',
          cardinality: 'one',
          id: 'x',
        },
      },
      [{ path: ['container'], code: 'unsupported' }]
    )
  })

  it('rejects a malformed composition', () => {
    expect(() => t.reference(SCOPE as never, 'note', 'one')).toThrow(TypeError)
    expect(() => t.reference(registry, '', 'one')).toThrow(TypeError)
    expect(() => t.reference(registry, 'note', 'some' as never)).toThrow(TypeError)
  })

  it.each([
    ['a bare resource table', REGISTRY],
    ['a scope without an app', { resources: REGISTRY }],
    ['a scope with an empty app', { app: '', resources: REGISTRY }],
    ['a scope without resources', { app: APP }],
    ['undefined', undefined],
  ])('rejects a scope function returning %s when the scope is first read', (_label, scope) => {
    // Construction stays lazy: the scope function is called only on use.
    const type = t.reference(() => scope as never, 'note', 'one')
    expect(() =>
      type.encode({ app: APP, resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' })
    ).toThrow(TypeError)
    expect(() =>
      type.decode(
        { reference: { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } },
        VECTOR_DECODE_CONTEXT
      )
    ).toThrow(TypeError)
  })
})

describe('the app', () => {
  const note = t.reference(registry, 'note', 'one')
  const notes = t.reference(registry, 'note', 'many')
  const wireNote = { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } as const
  const sdkNote = { app: APP, ...wireNote } as const

  it('is stamped from the scope on decode, at every level', () => {
    const { context, received } = recordingContext()
    valueOf(
      notes.decode(
        {
          reference: {
            resource: 'note',
            form: 'identity',
            cardinality: 'many',
            entries: [
              {
                ...wireNote,
                container: {
                  resource: 'folder',
                  form: 'identity',
                  cardinality: 'one',
                  id: { integer: '7' },
                },
              },
            ],
          },
        },
        context
      )
    )
    expect(
      sameValueMismatches(received, [
        {
          app: APP,
          resource: 'note',
          form: 'identity',
          cardinality: 'many',
          entries: [
            {
              ...sdkNote,
              container: {
                app: APP,
                resource: 'folder',
                form: 'identity',
                cardinality: 'one',
                id: 7,
              },
            },
          ],
        },
      ])
    ).toEqual([])
  })

  it('is never written to the wire, at any level', () => {
    const wire = valueOf(
      note.encode({
        ...sdkNote,
        container: {
          app: APP,
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: 7,
          container: {
            app: APP,
            resource: 'account',
            form: 'identity',
            cardinality: 'one',
            id: 'A1',
          },
        },
      })
    )
    expect(wire).toEqual({
      reference: {
        ...wireNote,
        container: {
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: { integer: '7' },
          container: { resource: 'account', form: 'identity', cardinality: 'one', id: 'A1' },
        },
      },
    })
    expect(JSON.stringify(wire)).not.toContain('"app"')
    const entries = valueOf(
      notes.encode({
        app: APP,
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [sdkNote],
      })
    )
    expect(JSON.stringify(entries)).not.toContain('"app"')
  })

  it('is required on encode, at every level', () => {
    expectEncodeIssues(note, wireNote, [{ path: ['app'], code: 'missing-field' }])
    expectEncodeIssues(
      note,
      {
        ...sdkNote,
        container: { resource: 'folder', form: 'identity', cardinality: 'one', id: 7 },
      },
      [{ path: ['container', 'app'], code: 'missing-field' }]
    )
    expectEncodeIssues(
      notes,
      {
        app: APP,
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [sdkNote, wireNote],
      },
      [{ path: ['entries', 1, 'app'], code: 'missing-field' }]
    )
    expect(note.sdk.safeParse(wireNote).success).toBe(false)
  })

  it('must be a string', () => {
    expectEncodeIssues(note, { ...sdkNote, app: 7 }, [{ path: ['app'], code: 'invalid-type' }])
  })

  it('rejects a reference of another app before anything else is read, at every level', () => {
    const message = messagesOf(note.encode({ ...sdkNote, app: 'calendar' }))
    expect(message).toBe(
      'Expected a reference to an object of "notes"; received a reference to an object of ' +
        '"calendar". A reference can be used only with the app it belongs to.'
    )
    expectEncodeIssues(note, { ...sdkNote, app: 'calendar' }, [
      { path: ['app'], code: 'invalid-type' },
    ])
    expectEncodeIssues(
      note,
      {
        ...sdkNote,
        container: {
          app: 'calendar',
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: 7,
        },
      },
      [{ path: ['container', 'app'], code: 'invalid-type' }]
    )
    expectEncodeIssues(
      notes,
      {
        app: APP,
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [{ ...sdkNote, app: 'calendar' }],
      },
      [{ path: ['entries', 0, 'app'], code: 'invalid-type' }]
    )
    expect(note.sdk.safeParse({ ...sdkNote, app: 'calendar' }).success).toBe(false)
  })

  it('is an undeclared field on the wire', () => {
    expectDecodeIssues(note, { reference: sdkNote }, [{ path: ['app'], code: 'unknown-field' }])
    expect(messagesOf(note.decode({ reference: sdkNote }, VECTOR_DECODE_CONTEXT))).toBe(
      'An identity reference has no "app": the route names the app, so a reference\'s wire ' +
        'form does not carry it.'
    )
    expect(note.wire.safeParse({ reference: sdkNote }).success).toBe(false)
    expectDecodeIssues(
      note,
      {
        reference: {
          ...wireNote,
          container: {
            app: APP,
            resource: 'folder',
            form: 'identity',
            cardinality: 'one',
            id: { integer: '7' },
          },
        },
      },
      [{ path: ['container', 'app'], code: 'unknown-field' }]
    )
  })
})

describe('resolvability', () => {
  /** Notes can be got and listed, labels only listed, attachments neither. */
  const scope = (): ReferenceScope =>
    scopeOf({
      note: { id: t.string(), get: 'notes.notes.get', list: 'notes.notes.list' },
      label: { id: t.string(), list: 'notes.labels.list' },
      attachment: { id: t.string() },
    })
  const label = { app: APP, resource: 'label', form: 'identity', cardinality: 'one', id: 'L1' }
  const attachment = { ...label, resource: 'attachment', id: 'X1' }
  const note = { app: APP, resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' }

  it('requires get for a single-object reference, and explains why', () => {
    const type = t.reference(scope, 'label', 'one')
    const result = type.encode(label)
    expect(issuesOf(result)).toEqual([{ path: [], code: 'unsupported' }])
    expect(messagesOf(result)).toBe(
      'The app has no operation that gets one "label", so a reference to one cannot be resolved.'
    )
    expect(type.sdk.safeParse(label).success).toBe(false)
  })

  it('requires list for a collection, and explains why', () => {
    const type = t.reference(scope, 'attachment', 'many')
    const every = {
      app: APP,
      resource: 'attachment',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
    }
    const result = type.encode(every)
    expect(issuesOf(result)).toEqual([{ path: [], code: 'unsupported' }])
    expect(messagesOf(result)).toBe(
      'The app has no operation that lists "attachment" objects, so a collection of them ' +
        'cannot be resolved.'
    )
    expect(type.sdk.safeParse(every).success).toBe(false)
    const labels = t.reference(scope, 'label', 'many')
    expect(labels.encode({ ...every, resource: 'label' }).ok).toBe(true)
  })

  it('requires get for every container, even one that can be listed', () => {
    const type = t.reference(scope, 'note', 'one')
    const inLabel = { ...note, container: label }
    const result = type.encode(inLabel)
    expect(issuesOf(result)).toEqual([{ path: ['container', 'resource'], code: 'unsupported' }])
    expect(messagesOf(result)).toBe(
      '"label" cannot be a container: the app has no operation that gets one "label", so the ' +
        'reference could never be resolved within it.'
    )
    expect(type.sdk.safeParse(inLabel).success).toBe(false)
    expect(type.sdk.safeParse({ ...note, container: note }).success).toBe(true)
    // The rule holds at every depth.
    const nested = { ...note, container: { ...note, container: label } }
    expect(issuesOf(type.encode(nested))).toEqual([
      { path: ['container', 'container', 'resource'], code: 'unsupported' },
    ])
    expect(type.sdk.safeParse(nested).success).toBe(false)
  })

  it('checks identity-collection entries as members of their collection only', () => {
    const labels = t.reference(scope, 'label', 'many')
    const collection = {
      app: APP,
      resource: 'label',
      form: 'identity',
      cardinality: 'many',
      entries: [label],
    }
    expect(labels.encode(collection).ok).toBe(true)
    expect(labels.sdk.safeParse(collection).success).toBe(true)
  })

  it('is not checked when decoding, so a returned reference is always bound', () => {
    const { context, received } = recordingContext()
    const type = t.reference(scope, 'attachment', 'one')
    const wire = {
      reference: { resource: 'attachment', form: 'identity', cardinality: 'one', id: 'X1' },
    }
    expect(type.decode(wire, context).ok).toBe(true)
    expect(received).toEqual([attachment])
    expect(type.wire.safeParse(wire).success).toBe(true)
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
        app: APP,
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: 3 },
        container: {
          app: APP,
          resource: 'folder',
          form: 'identity',
          cardinality: 'one',
          id: 7,
          container: {
            app: APP,
            resource: 'account',
            form: 'identity',
            cardinality: 'one',
            id: 'A1',
          },
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

  it('never calls resolve or any other live member, and ignores function members', () => {
    const reference = {
      app: APP,
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
        app: APP,
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
      readonly app = APP
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
        app: APP,
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
        app: APP,
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [
          { app: APP, resource: 'note', form: 'identity', cardinality: 'one', id: 1 },
          { app: APP, resource: 'note', form: 'identity', cardinality: 'one', id: 'N2' },
          { app: APP, resource: 'note', form: 'identity', cardinality: 'many', entries: [] },
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
      type.encode({ app: APP, resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' })
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
      { app: APP, form: 'identity', cardinality: 'one', id: 7 },
      [{ path: ['resource'], code: 'missing-field' }],
    ],
    [
      'an unknown form',
      { app: APP, resource: 'folder', form: 'query', cardinality: 'one' },
      [{ path: ['form'], code: 'unknown-enum-member' }],
    ],
    [
      'an identity reference with no id',
      { app: APP, resource: 'folder', form: 'identity', cardinality: 'one' },
      [{ path: ['id'], code: 'missing-field' }],
    ],
    [
      'a collection selector at a single-object position',
      {
        app: APP,
        resource: 'folder',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'every' },
      },
      [{ path: ['selector', 'by'], code: 'unknown-enum-member' }],
    ],
    [
      'a name selector with no name',
      {
        app: APP,
        resource: 'folder',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name' },
      },
      [{ path: ['selector', 'name'], code: 'missing-field' }],
    ],
    [
      'a container with a wrong id type',
      {
        app: APP,
        resource: 'folder',
        form: 'identity',
        cardinality: 'one',
        id: 7,
        container: { app: APP, resource: 'account', form: 'identity', cardinality: 'one', id: 1 },
      },
      [{ path: ['container', 'id'], code: 'invalid-type' }],
    ],
  ] as const)('rejects %s', (_label, value, issues) => {
    expectEncodeIssues(type, value, [...issues])
  })
})

describe('the declared-fields rule', () => {
  const note = t.reference(registry, 'note', 'one')
  const notes = t.reference(registry, 'note', 'many')
  const wirePayload = { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } as const
  const identity = { app: APP, ...wirePayload } as const
  const wireIdentity = { reference: wirePayload }

  it('encodes a class instance by its declared fields, ignoring prototype members and private state', () => {
    class BoundNote {
      readonly app = APP
      readonly resource = 'note'
      readonly form = 'identity'
      readonly cardinality = 'one'
      readonly #id: string
      readonly #session: string
      constructor(id: string, session: string) {
        this.#id = id
        this.#session = session
      }
      get id(): string {
        return this.#id
      }
      resolve(): Promise<string> {
        return Promise.resolve(this.#session)
      }
    }
    const bound = new BoundNote('N1', 'session-secret')
    expect(valueOf(note.encode(bound))).toEqual(wireIdentity)
    expect(note.sdk.safeParse(bound).success).toBe(true)
  })

  it('accepts own function members and ignores non-enumerable properties', () => {
    const bound = { ...identity, resolve: VECTOR_RESOLVE }
    Object.defineProperty(bound, 'session', { value: 'session-secret', enumerable: false })
    expect(valueOf(note.encode(bound))).toEqual(wireIdentity)
    expect(note.sdk.safeParse(bound).success).toBe(true)
  })

  it('rejects an own data property the form does not declare, in the SDK schema too', () => {
    const tagged = { ...identity, revision: 'r1' }
    expectEncodeIssues(note, tagged, [{ path: ['revision'], code: 'unknown-field' }])
    expect(note.sdk.safeParse(tagged).success).toBe(false)
  })

  it('names the fields of the form for an unknown key, in both directions', () => {
    // The SDK form carries the app; the wire form does not.
    expect(messagesOf(note.encode({ ...identity, contianer: identity }))).toBe(
      '"contianer" is not a field of an identity reference (its fields are "app", "resource", ' +
        '"form", "cardinality", "id", "container").'
    )
    expect(
      messagesOf(
        note.decode(
          { reference: { ...wirePayload, contianer: wirePayload } },
          VECTOR_DECODE_CONTEXT
        )
      )
    ).toBe(
      '"contianer" is not a field of an identity reference (its fields are "resource", "form", ' +
        '"cardinality", "id", "container").'
    )
  })

  it.each([
    [
      'an identity reference with a selector',
      note,
      { ...identity, selector: { by: 'every' } },
      'An identity reference has no "selector": it denotes its object by its id, and a selector ' +
        'belongs to the selector form.',
    ],
    [
      'a selector reference with an id',
      note,
      {
        app: APP,
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Inbox' },
        id: 'N1',
      },
      'A selector reference has no "id": it denotes its object by its selector, and an id ' +
        'belongs to the identity form.',
    ],
    [
      'an identity collection with a container',
      notes,
      {
        app: APP,
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [],
        container: identity,
      },
      'An identity collection has no "container": each entry carries its own container.',
    ],
    [
      'a name selector with an index',
      note,
      {
        app: APP,
        resource: 'note',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'Inbox', index: 0 },
      },
      'A "name" selector has no "index": it selects by name, not by position.',
    ],
  ] as const)('explains %s by the form it belongs to', (_label, type, value, message) => {
    expect(messagesOf(type.encode(value))).toBe(message)
  })

  it('gives the same explanation when decoding', () => {
    expect(
      messagesOf(
        note.decode(
          { reference: { ...wirePayload, selector: { by: 'name', name: 'Inbox' } } },
          VECTOR_DECODE_CONTEXT
        )
      )
    ).toBe(
      'An identity reference has no "selector": it denotes its object by its id, and a selector ' +
        'belongs to the selector form.'
    )
  })

  it('applies to nested containers and identity collection entries', () => {
    expectEncodeIssues(
      note,
      { ...identity, container: { ...identity, resource: 'account', revision: 'r1' } },
      [{ path: ['container', 'revision'], code: 'unknown-field' }]
    )
    expectEncodeIssues(
      notes,
      {
        app: APP,
        resource: 'note',
        form: 'identity',
        cardinality: 'many',
        entries: [identity, { ...identity, revision: 'r1' }],
      },
      [{ path: ['entries', 1, 'revision'], code: 'unknown-field' }]
    )
  })

  it('still rejects undeclared keys whose value is a function when decoding', () => {
    // Wire values are JSON; a function is never wire data, so decode does not
    // carve out function members the way encode does.
    expectDecodeIssues(note, { reference: { ...wirePayload, resolve: VECTOR_RESOLVE } }, [
      { path: ['resolve'], code: 'unknown-field' },
    ])
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
        app: APP,
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
  const identityWire = { resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' } as const
  const selectorWire = {
    resource: 'note',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'name', name: 'Inbox' },
  } as const
  const identity = { app: APP, ...identityWire } as const
  const selector = { app: APP, ...selectorWire } as const

  it('makes a materialized reference list with t.array, mixing forms', () => {
    const list = t.array(note)
    expect(list.plan).toEqual({
      kind: 'array',
      items: { kind: 'reference', resource: 'note', cardinality: 'one' },
    })
    const wire = [{ reference: identityWire }, { reference: selectorWire }]
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
      primary: { reference: identityWire },
      secondary: { reference: selectorWire },
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
      {
        readonly id: ValueType<unknown>
        readonly get: 'notes.notes.get' | 'notes.folders.get'
        readonly record: ValueType<unknown>
      }
    > = {}
    const resources = (): ReferenceScope => scopeOf(table)
    const noteRecord = t.record({
      title: t.string(),
      folder: t.reference(resources, 'folder', 'one'),
    })
    const folderRecord = t.record({
      name: t.string(),
      notes: t.array(t.reference(resources, 'note', 'one')),
      parent: t.optional(t.reference(resources, 'folder', 'one')),
    })
    table['note'] = { id: t.string(), get: 'notes.notes.get', record: noteRecord }
    table['folder'] = { id: t.integer(), get: 'notes.folders.get', record: folderRecord }

    const folder = {
      name: 'Inbox',
      notes: [{ app: APP, resource: 'note', form: 'identity', cardinality: 'one', id: 'N1' }],
      parent: { app: APP, resource: 'folder', form: 'identity', cardinality: 'one', id: 1 },
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
          folder: { app: APP, resource: 'folder', form: 'identity', cardinality: 'one', id: 2 },
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
      app: APP,
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
        app: APP,
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

describe('resources without an identifier', () => {
  const table: ReferenceRegistry = {
    note: { id: t.string(), get: 'notes.notes.get', list: 'notes.notes.list' },
    paragraph: { get: 'notes.paragraphs.get', list: 'notes.paragraphs.list' },
  }
  const resources = (): ReferenceScope => scopeOf(table)
  /** A scope in which no resource has an identifier. */
  const unidentified = (): ReferenceScope =>
    scopeOf({
      paragraph: { get: 'notes.paragraphs.get', list: 'notes.paragraphs.list' },
      word: { get: 'notes.words.get' },
    })

  /** The `reference` payload schema of a derived draft-7 JSON Schema. */
  const payloadSchema = (type: ValueType<unknown>): Record<string, unknown> => {
    const schema = z.toJSONSchema(type.wire, { target: 'draft-7' }) as Record<string, unknown>
    const properties = schema['properties'] as Record<string, Record<string, unknown>>
    const payload = properties['reference']
    if (payload === undefined) throw new Error('expected a reference property')
    return payload
  }

  it('explains that only selectors can reference them', () => {
    const result = t
      .reference(resources, 'paragraph', 'one')
      .encode({ app: APP, resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' })
    expect(issuesOf(result)).toEqual([{ path: [], code: 'unsupported' }])
    expect(messagesOf(result)).toBe(
      '"paragraph" has no identifier, so it can be referenced only by a selector ' +
        '(name, index, every, or range).'
    )
  })

  it.each(['one', 'many'] as const)(
    'derive a %s wire JSON Schema with only the selector form',
    (cardinality) => {
      const payload = payloadSchema(
        cardinality === 'one'
          ? t.reference(resources, 'paragraph', 'one')
          : t.reference(resources, 'paragraph', 'many')
      )
      // No union: the identity branch is omitted, and the selector branch remains.
      expect(payload['anyOf']).toBeUndefined()
      expect(payload['type']).toBe('object')
      expect((payload['properties'] as Record<string, unknown>)['form']).toEqual({
        type: 'string',
        const: 'selector',
      })
      expect((payload['properties'] as Record<string, unknown>)['cardinality']).toEqual({
        type: 'string',
        const: cardinality,
      })
    }
  )

  it('omit identity branches from the container union on the wire and in the SDK schema', () => {
    const notes = t.reference(resources, 'note', 'many')
    const inParagraph = (container: Record<string, unknown>) => ({
      resource: 'note',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'every' },
      container,
    })
    /** The SDK form of {@link inParagraph}: the app at both levels. */
    const sdkInParagraph = (container: Record<string, unknown>) => ({
      app: APP,
      ...inParagraph({ app: APP, ...container }),
    })
    const selected = {
      resource: 'paragraph',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'index', index: { integer: '0' } },
    }
    const identified = { resource: 'paragraph', form: 'identity', cardinality: 'one', id: 'P1' }
    expect(notes.wire.safeParse({ reference: inParagraph(selected) }).success).toBe(true)
    expect(notes.wire.safeParse({ reference: inParagraph(identified) }).success).toBe(false)
    expect(
      notes.sdk.safeParse(sdkInParagraph({ ...selected, selector: { by: 'index', index: 0 } }))
        .success
    ).toBe(true)
    expect(notes.sdk.safeParse(sdkInParagraph(identified)).success).toBe(false)
  })

  it('work when no resource in the table has an identifier', () => {
    const paragraphs = t.reference(unidentified, 'paragraph', 'many')
    const words = t.reference(unidentified, 'word', 'one')
    const word = {
      app: APP,
      resource: 'word',
      form: 'selector',
      cardinality: 'one',
      selector: { by: 'name', name: 'macts' },
      container: {
        app: APP,
        resource: 'paragraph',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'index', index: 1 },
      },
    }
    expect(valueOf(words.encode(word))).toEqual({
      reference: {
        resource: 'word',
        form: 'selector',
        cardinality: 'one',
        selector: { by: 'name', name: 'macts' },
        container: {
          resource: 'paragraph',
          form: 'selector',
          cardinality: 'one',
          selector: { by: 'index', index: { integer: '1' } },
        },
      },
    })
    expectEncodeIssues(
      words,
      {
        ...word,
        container: {
          app: APP,
          resource: 'paragraph',
          form: 'identity',
          cardinality: 'one',
          id: 'P',
        },
      },
      [{ path: ['container'], code: 'unsupported' }]
    )
    expectEncodeIssues(
      paragraphs,
      { app: APP, resource: 'paragraph', form: 'identity', cardinality: 'many', entries: [] },
      [{ path: [], code: 'unsupported' }]
    )
    for (const type of [paragraphs, words]) {
      expect(() => z.toJSONSchema(type.wire, { target: 'draft-7' })).not.toThrow()
    }
    expect(
      paragraphs.wire.safeParse({
        reference: {
          resource: 'paragraph',
          form: 'selector',
          cardinality: 'many',
          selector: { by: 'every' },
        },
      }).success
    ).toBe(true)
    expect(
      paragraphs.wire.safeParse({
        reference: { resource: 'paragraph', form: 'identity', cardinality: 'many', entries: [] },
      }).success
    ).toBe(false)
  })
})

describe('user-facing messages', () => {
  it('never mention the native automation layer', () => {
    const type = t.reference(registry, 'note', 'many')
    const results = [
      type.encode({
        app: APP,
        resource: 'note',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: 3, end: 1 },
      }),
      type.encode({
        app: APP,
        resource: 'calendar',
        form: 'identity',
        cardinality: 'many',
        entries: [],
      }),
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
        app: APP,
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
