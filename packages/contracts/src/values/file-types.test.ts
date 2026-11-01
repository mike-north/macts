/**
 * Unit tests for the file value types, `t.file()` and `t.fileSource()`: plans,
 * what the file binder receives, the output-only rule for file values, the
 * dropped expiry of uploaded sources, the fail-closed decode of upload
 * handles, and their schemas.
 *
 * Round trips for each shape live in the codec vectors; these tests pin each
 * constructor's own contract. Expected values are written by hand from the
 * contract.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A7 (Files and Binary Transfers)
 * @see phases/13-sdk-value-and-execution-contracts.md §D8 (Binary Transfer Handle Shapes)
 * @see https://zod.dev/json-schema
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { FileData, FileValue } from '../files/index.js'
import type { IssuePath } from '../issues.js'
import type { CodecResult, DecodeContext, ValueType } from './value-type.js'
import { ValueTypes as t } from './value-types.js'
import type { ValueIssueCode } from './value-issues.js'
import { VECTOR_DECODE_CONTEXT, VECTOR_FETCH, sameValueMismatches } from './vectors/index.js'

/**
 * `2026-10-31T17:04:05.120Z` in epoch milliseconds: 20757 days from
 * 1970-01-01 to 2026-10-31 (56 × 365 + 14 leap days to 2026-01-01, plus 303
 * days to October 31), × 86_400_000 = 1_793_404_800_000, plus 17 h
 * (61_200_000), 4 min (240_000), and 5.120 s (5_120).
 */
const OBSERVED_AT_MS = 1_793_466_245_120

/** A decode context whose file binder keeps the grant in a closure, as a real one does. */
function closureContext(): { context: DecodeContext; received: FileData[] } {
  const received: FileData[] = []
  return {
    received,
    context: {
      bindReference() {
        throw new Error('no reference binding in file tests')
      },
      bindFile(data) {
        received.push(data)
        const { grant } = data
        const value: FileValue = {
          ...(data.path === undefined ? {} : { path: data.path }),
          existence: data.existence,
          fetch: () => Promise.reject(new Error(`would exchange ${grant}`)),
        }
        return value
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

const observedAt = { date: '2026-10-31T17:04:05.120Z' }

describe('file', () => {
  const type = t.file()

  it('has the file plan', () => {
    expect(type.plan).toEqual({ kind: 'file' })
  })

  it('hands the binder decoded data: observedAt as a Date, the grant, and no absent path', () => {
    const { context, received } = closureContext()
    valueOf(type.decode({ file: { exists: true, observedAt, grant: 'grant-1' } }, context))
    expect(received).toHaveLength(1)
    const [data] = received
    expect(data?.existence.observedAt).toBeInstanceOf(Date)
    expect(data?.existence.observedAt.getTime()).toBe(OBSERVED_AT_MS)
    expect(data?.existence.exists).toBe(true)
    expect(data?.grant).toBe('grant-1')
    expect(Object.hasOwn(data ?? {}, 'path')).toBe(false)
  })

  it('honors an explicit offset in the observation time', () => {
    const { context, received } = closureContext()
    valueOf(
      type.decode(
        {
          file: {
            exists: false,
            observedAt: { date: '2026-10-31T19:04:05.120+02:00' },
            grant: 'g',
          },
        },
        context
      )
    )
    expect(received[0]?.existence.observedAt.getTime()).toBe(OBSERVED_AT_MS)
  })

  it('encodes file data on the runtime side, ignoring fetch and omitting an absent path', () => {
    const data = {
      existence: { exists: true, observedAt: new Date(OBSERVED_AT_MS) },
      grant: 'grant-1',
      fetch: () => {
        throw new Error('encode must not fetch')
      },
    }
    expect(
      sameValueMismatches(valueOf(type.encode(data)), {
        file: { exists: true, observedAt, grant: 'grant-1' },
      })
    ).toEqual([])
  })

  it('rejects a bound file value as input, explaining that inputs take file sources', () => {
    const { context } = closureContext()
    const bound = valueOf(
      type.decode(
        { file: { path: '/Users/me/a.pdf', exists: true, observedAt, grant: 'g' } },
        context
      )
    )
    const result = type.encode(bound)
    expect(issuesOf(result)).toEqual([{ path: [], code: 'unsupported' }])
    const message = messagesOf(result)
    expect(message).toMatch(/operation results/)
    expect(message).toMatch(/file source/)
  })

  it.each([
    [
      'a grant that is not text',
      { existence: { exists: true, observedAt: new Date(0) }, grant: 1 },
      [{ path: [], code: 'unsupported' }],
    ],
    [
      'an empty grant',
      { existence: { exists: true, observedAt: new Date(0) }, grant: '' },
      [{ path: ['grant'], code: 'out-of-range' }],
    ],
    ['no existence', { grant: 'g' }, [{ path: ['existence'], code: 'missing-field' }]],
    [
      'an invalid observation time',
      { existence: { exists: true, observedAt: new Date(Number.NaN) }, grant: 'g' },
      [{ path: ['existence', 'observedAt'], code: 'invalid-date' }],
    ],
    [
      'a path that is not text, and existence that is not boolean',
      { path: 1, existence: { exists: 'yes', observedAt: new Date(0) }, grant: 'g' },
      [
        { path: ['path'], code: 'invalid-type' },
        { path: ['existence', 'exists'], code: 'invalid-type' },
      ],
    ],
    ['null', null, [{ path: [], code: 'not-nullable' }]],
  ] as const)('encode rejects %s', (_label, value, issues) => {
    expectEncodeIssues(type, value, [...issues])
  })

  it.each([
    [
      'a missing grant',
      { file: { exists: true, observedAt } },
      [{ path: ['grant'], code: 'missing-field' }],
    ],
    [
      'an undeclared key',
      { file: { exists: true, observedAt, grant: 'g', size: 10 } },
      [{ path: ['size'], code: 'unknown-field' }],
    ],
    [
      'an SDK-shaped existence',
      { file: { existence: { exists: true }, grant: 'g' } },
      [
        { path: ['existence'], code: 'unknown-field' },
        { path: ['existence', 'exists'], code: 'missing-field' },
        { path: ['existence', 'observedAt'], code: 'missing-field' },
      ],
    ],
    [
      'an observation time that is bare text',
      { file: { exists: true, observedAt: '2026-10-31T17:04:05.120Z', grant: 'g' } },
      [{ path: ['existence', 'observedAt'], code: 'invalid-type' }],
    ],
    [
      'a payload that is not an object',
      { file: 'report.pdf' },
      [{ path: [], code: 'invalid-control-record' }],
    ],
    [
      'a bare payload',
      { exists: true, observedAt, grant: 'g' },
      [{ path: [], code: 'invalid-control-record' }],
    ],
  ] as const)('decode rejects %s', (_label, wire, issues) => {
    expectDecodeIssues(type, wire, [...issues])
  })

  it('has an SDK schema for the bound file value shape', () => {
    const value = { existence: { exists: true, observedAt: new Date(0) }, fetch: VECTOR_FETCH }
    expect(type.sdk.safeParse(value).success).toBe(true)
    expect(type.sdk.safeParse({ ...value, fetch: undefined }).success).toBe(false)
    expect(
      type.sdk.safeParse({
        ...value,
        existence: { exists: true, observedAt: new Date(Number.NaN) },
      }).success
    ).toBe(false)
  })

  it('has a wire schema that converts to draft-7 JSON Schema', () => {
    const schema = z.toJSONSchema(type.wire, { target: 'draft-7' }) as Record<string, unknown>
    expect(schema['required']).toEqual(['file'])
    expect(schema['additionalProperties']).toBe(false)
  })
})

describe('fileSource', () => {
  const type = t.fileSource()

  it('has the file-source plan', () => {
    expect(type.plan).toEqual({ kind: 'file-source' })
  })

  it('encodes an uploaded file as its upload id, validating but not sending the expiry', () => {
    const encoded = valueOf(
      type.encode({ kind: 'uploaded-file', uploadId: 'U1', expiresAt: new Date(OBSERVED_AT_MS) })
    )
    expect(
      sameValueMismatches(encoded, { fileSource: { kind: 'uploaded-file', uploadId: 'U1' } })
    ).toEqual([])
    expectEncodeIssues(type, { kind: 'uploaded-file', uploadId: 'U1' }, [
      { path: ['expiresAt'], code: 'missing-field' },
    ])
    expectEncodeIssues(
      type,
      { kind: 'uploaded-file', uploadId: 'U1', expiresAt: new Date(Number.NaN) },
      [{ path: ['expiresAt'], code: 'invalid-date' }]
    )
    expect(type.sdk.safeParse({ kind: 'uploaded-file', uploadId: 'U1' }).success).toBe(false)
  })

  it('encodes an uploaded file class instance with accessors by its declared fields', () => {
    class Upload {
      readonly kind = 'uploaded-file'
      readonly #id: string
      constructor(id: string) {
        this.#id = id
      }
      get uploadId(): string {
        return this.#id
      }
      get expiresAt(): Date {
        return new Date(OBSERVED_AT_MS)
      }
      describe(): string {
        return `upload ${this.#id}`
      }
    }
    const upload = new Upload('U1')
    expect(valueOf(type.encode(upload))).toEqual({
      fileSource: { kind: 'uploaded-file', uploadId: 'U1' },
    })
    expect(type.sdk.safeParse(upload).success).toBe(true)
  })

  it('ignores function members and non-enumerable properties when encoding', () => {
    const source = { kind: 'caller-owned-file', path: '/a', toString: () => '/a' }
    Object.defineProperty(source, 'handle', { value: 3, enumerable: false })
    expect(valueOf(type.encode(source))).toEqual({
      fileSource: { kind: 'caller-owned-file', path: '/a' },
    })
    expect(type.sdk.safeParse(source).success).toBe(true)
  })

  it.each([
    [
      'an uploaded file with a path',
      { kind: 'uploaded-file', uploadId: 'U1', expiresAt: new Date(OBSERVED_AT_MS), path: '/a' },
      'An uploaded file has no "path": it is denoted by its upload id, and a path belongs to a ' +
        'caller-owned file.',
    ],
    [
      'a caller-owned file with an upload id',
      { kind: 'caller-owned-file', path: '/a', uploadId: 'U1' },
      'A caller-owned file has no "uploadId": it is denoted by its path on the executing Mac, ' +
        'and an upload id belongs to an uploaded file.',
    ],
  ] as const)('explains %s by the kind it belongs to', (_label, value, message) => {
    expect(messagesOf(type.encode(value))).toBe(message)
    expect(type.sdk.safeParse(value).success).toBe(false)
  })

  it('reports undeclared keys of an upload handle beside the fail-closed rejection', () => {
    const result = type.decode(
      { fileSource: { kind: 'uploaded-file', uploadId: 'U1', expiresAt: { date: '2026-10-31' } } },
      VECTOR_DECODE_CONTEXT
    )
    expect(issuesOf(result)).toEqual([
      { path: ['expiresAt'], code: 'unknown-field' },
      { path: [], code: 'unsupported' },
    ])
    expect(messagesOf(result)).toBe(
      'An uploaded file has no "expiresAt": the service\'s transfer store is authoritative for ' +
        "an upload's expiry.\nUpload handles are resolved by the service, not decoded."
    )
  })

  it('refuses to decode an upload handle, which only the service resolves', () => {
    const result = type.decode(
      { fileSource: { kind: 'uploaded-file', uploadId: 'U1' } },
      VECTOR_DECODE_CONTEXT
    )
    expect(issuesOf(result)).toEqual([{ path: [], code: 'unsupported' }])
    expect(messagesOf(result)).toBe('Upload handles are resolved by the service, not decoded.')
  })

  it('decodes a caller-owned file to exactly its kind and path', () => {
    const decoded = valueOf(
      type.decode(
        { fileSource: { kind: 'caller-owned-file', path: '/tmp/a.pdf' } },
        VECTOR_DECODE_CONTEXT
      )
    )
    expect(sameValueMismatches(decoded, { kind: 'caller-owned-file', path: '/tmp/a.pdf' })).toEqual(
      []
    )
  })

  it.each([
    ['a bare path', '/Users/me/a.pdf', [{ path: [], code: 'invalid-type' }]],
    ['no kind', { path: '/a' }, [{ path: ['kind'], code: 'missing-field' }]],
    [
      'an unknown kind',
      { kind: 'download', url: 'https://example.com' },
      [{ path: ['kind'], code: 'unknown-enum-member' }],
    ],
    [
      'an undeclared field',
      { kind: 'caller-owned-file', path: '/a', mode: 'r' },
      [{ path: ['mode'], code: 'unknown-field' }],
    ],
    [
      'an empty upload id',
      { kind: 'uploaded-file', uploadId: '', expiresAt: new Date(0) },
      [{ path: ['uploadId'], code: 'out-of-range' }],
    ],
    [
      'a file value',
      { existence: { exists: true, observedAt: new Date(0) }, fetch: VECTOR_FETCH },
      [{ path: ['kind'], code: 'missing-field' }],
    ],
  ] as const)('encode rejects %s', (_label, value, issues) => {
    expectEncodeIssues(type, value, [...issues])
  })

  it.each([
    [
      'an empty path',
      { fileSource: { kind: 'caller-owned-file', path: '' } },
      [{ path: ['path'], code: 'out-of-range' }],
    ],
    [
      'an undeclared key',
      { fileSource: { kind: 'caller-owned-file', path: '/a', size: 1 } },
      [{ path: ['size'], code: 'unknown-field' }],
    ],
    [
      'a payload that is not an object',
      { fileSource: '/a' },
      [{ path: [], code: 'invalid-control-record' }],
    ],
  ] as const)('decode rejects %s', (_label, wire, issues) => {
    expectDecodeIssues(type, wire, [...issues])
  })

  it('has a wire schema that admits both kinds and converts to draft-7 JSON Schema', () => {
    expect(
      type.wire.safeParse({ fileSource: { kind: 'uploaded-file', uploadId: 'U1' } }).success
    ).toBe(true)
    expect(
      type.wire.safeParse({
        fileSource: { kind: 'uploaded-file', uploadId: 'U1', expiresAt: { date: observedAt.date } },
      }).success
    ).toBe(false)
    expect(() => z.toJSONSchema(type.wire, { target: 'draft-7' })).not.toThrow()
  })
})

describe('user-facing messages', () => {
  it('never mention the native automation layer', () => {
    const results = [
      t.file().encode({ existence: { exists: true, observedAt: new Date(0) } }),
      t.file().decode({ file: { exists: true, observedAt, grant: '' } }, VECTOR_DECODE_CONTEXT),
      t
        .fileSource()
        .decode({ fileSource: { kind: 'uploaded-file', uploadId: 'U1' } }, VECTOR_DECODE_CONTEXT),
      t.fileSource().encode({ kind: 'caller-owned-file', path: '' }),
    ]
    for (const result of results) {
      expect(messagesOf(result)).not.toMatch(/applescript|jxa|osascript/i)
    }
  })
})
