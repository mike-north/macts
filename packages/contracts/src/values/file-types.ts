/**
 * Internal construction of the file value types, `t.file()` and
 * `t.fileSource()`.
 *
 * The two are deliberately asymmetric, because a file crosses an operation
 * boundary in one direction only:
 *
 * - A **file value** is an operation's result. Decoding reads the strict
 *   `file` wire form into {@link FileData} and hands it to
 *   `DecodeContext.bindFile`, which keeps the grant private to the bound
 *   value's `fetch`. Encoding happens only on the runtime side, from
 *   `FileData`; a value without a grant (such as a bound `FileValue` sent back
 *   as input) is rejected, because inputs take file sources.
 * - A **file source** is an operation's input. Encoding follows the
 *   declared-fields rule of `declared-fields` (any object, read by property
 *   access; function members ignored; other undeclared own data rejected)
 *   and emits only what the wire form carries; an uploaded file's `expiresAt`
 *   is validated on the SDK value but is not sent, because the service's transfer store is authoritative
 *   for expiry. Decoding admits only caller-owned files: the runtime resolves
 *   uploads from the wire form in its transfer step before any SDK decoding,
 *   so an SDK decode of an upload handle is reached only when that step was
 *   bypassed, and failing is the fail-closed outcome.
 *
 * Issue paths name locations in the SDK data (`path`, `existence.exists`,
 * `existence.observedAt`, `grant`; `kind`, `path`, `uploadId`, `expiresAt`) in
 * both directions, even where the wire form flattens them. Nested metadata
 * uses the shared value codecs, so an observation time follows the date rules
 * exactly.
 *
 * This module is not part of the package's public surface.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import type { FileData, FileSource, FileValue } from '../files/index.js'
import type { IssuePath } from '../issues.js'
import {
  INVALID,
  controlPayload,
  defineValueType,
  fieldMismatch,
  mismatch,
  type Codec,
  type Invalid,
  type Issues,
} from './codec.js'
import {
  declaredFields,
  openSdkObject,
  openWireObject,
  type FieldReader,
} from './declared-fields.js'
import { describeReceived, issue, quote } from './issue-helpers.js'
import { DATE_CODEC } from './leaf-codecs.js'
import { dateSdkSchema, sdkObject } from './sdk-schemas.js'
import type { ValueType } from './value-type.js'
import type { ValueTypeOptions } from './value-types.js'
import { FileSourceWireSchema, FileWireSchema } from './wire-schemas.js'
import type { WireValue } from './wire.js'

/**
 * Why a value without a grant cannot be encoded as a file value. Stated once
 * so every rejection explains the rule the same way.
 */
const FILE_VALUE_INPUT_MESSAGE =
  'File values are operation results and cannot be sent as input: this value carries no fetch ' +
  'grant. To supply a file to an operation, pass a file source instead: ' +
  '{kind: "caller-owned-file", path} for a file on the executing Mac, or the uploaded file ' +
  'returned by an upload.'

/**
 * Why an uploaded-file source does not decode. The service resolves upload
 * handles from the wire form; see the module documentation.
 */
const UPLOAD_DECODE_MESSAGE = 'Upload handles are resolved by the service, not decoded.'

const FILE_EXAMPLE = 'a file control record, {"file": {…}}'
const FILE_SOURCE_EXAMPLE = 'a file source control record, {"fileSource": {…}}'
const FILE_SOURCE_KINDS = '"caller-owned-file" or "uploaded-file"'

/** Wire fields of a `file` payload. */
const FILE_WIRE_FIELDS = declaredFields('a file payload', ['path', 'exists', 'observedAt', 'grant'])

/*
 * The declared fields of each file source kind. In SDK form an uploaded file
 * also declares `expiresAt`, which encoding validates and then drops; the
 * wire form does not carry it.
 */
const CALLER_OWNED_FIELDS = declaredFields('a caller-owned file', ['kind', 'path'], {
  uploadId:
    'it is denoted by its path on the executing Mac, and an upload id belongs to an uploaded file',
  expiresAt: 'it is a file on the executing Mac, and an expiry belongs to an uploaded file',
})
const UPLOADED_MISPLACED = {
  path: 'it is denoted by its upload id, and a path belongs to a caller-owned file',
}
const UPLOADED_SDK_FIELDS = declaredFields(
  'an uploaded file',
  ['kind', 'uploadId', 'expiresAt'],
  UPLOADED_MISPLACED
)
const UPLOADED_WIRE_FIELDS = declaredFields('an uploaded file', ['kind', 'uploadId'], {
  ...UPLOADED_MISPLACED,
  expiresAt: "the service's transfer store is authoritative for an upload's expiry",
})

const FILE_SOURCE_EXPECTED =
  'a file source, {kind: "caller-owned-file", path} or {kind: "uploaded-file", uploadId, expiresAt}'

/** SDK schema of a file value: what a bound `FileValue` exposes. */
const FILE_SDK_SCHEMA = z.looseObject({
  path: z.string().exactOptional(),
  existence: z.looseObject({ exists: z.boolean(), observedAt: dateSdkSchema() }),
  fetch: z.custom<FileValue['fetch']>((value) => typeof value === 'function', {
    error: 'A file value has a fetch function.',
  }),
})

/** Wire schema of a file value: a `file` control record. */
const FILE_WIRE_SCHEMA = z.strictObject({ file: FileWireSchema })

/**
 * SDK schema of a file source, under the declared-fields rule encoding
 * follows; an uploaded file's expiry must be a valid `Date`.
 */
const FILE_SOURCE_SDK_SCHEMA = z.discriminatedUnion('kind', [
  sdkObject({ kind: z.literal('caller-owned-file'), path: z.string().min(1) }),
  sdkObject({
    kind: z.literal('uploaded-file'),
    uploadId: z.string().min(1),
    expiresAt: dateSdkSchema(),
  }),
])

/** Wire schema of a file source: a `fileSource` control record. */
const FILE_SOURCE_WIRE_SCHEMA = z.strictObject({ fileSource: FileSourceWireSchema })

/**
 * Read required, non-empty text at `path`. Empty text is outside the domain
 * of the field, so it is `out-of-range`.
 */
function readText(
  raw: unknown,
  path: IssuePath,
  issues: Issues,
  expected: string
): string | Invalid {
  if (typeof raw !== 'string') return fieldMismatch(raw, path, issues, expected)
  if (raw !== '') return raw
  issues.push(issue(path, 'out-of-range', `Expected ${expected}; received empty text.`))
  return INVALID
}

/** Read the optional path of a file: absent, or text. */
function readOptionalPath(
  raw: unknown,
  path: IssuePath,
  issues: Issues
): string | undefined | Invalid {
  if (raw === undefined || typeof raw === 'string') return raw
  return mismatch(raw, [...path, 'path'], issues, 'the original path (a string)')
}

/** Assemble `FileData`, omitting an absent path. */
function fileData(
  path: string | undefined,
  exists: boolean,
  observedAt: Date,
  grant: string
): FileData {
  const existence = { exists, observedAt }
  return path === undefined ? { existence, grant } : { path, existence, grant }
}

/** Codec for file values: encode from `FileData` (runtime side), decode to a bound `FileValue`. */
const FILE_CODEC: Codec<FileValue> = {
  encode(value, path, issues) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return mismatch(value, path, issues, 'file data {path?, existence, grant}')
    }
    const source: object = value
    const read = (key: string): unknown => Reflect.get(source, key)

    let valid = true
    const grant = read('grant')
    if (typeof grant !== 'string') {
      issues.push(issue(path, 'unsupported', FILE_VALUE_INPUT_MESSAGE))
      valid = false
    } else if (grant === '') {
      issues.push(issue([...path, 'grant'], 'out-of-range', 'A file grant must be non-empty text.'))
      valid = false
    }

    const filePath = readOptionalPath(read('path'), path, issues)
    const existencePath = [...path, 'existence']
    const existence = read('existence')
    let exists: unknown = INVALID
    let observedAt: WireValue | Invalid = INVALID
    if (typeof existence !== 'object' || existence === null || Array.isArray(existence)) {
      fieldMismatch(
        existence,
        existencePath,
        issues,
        'an existence observation {exists, observedAt}'
      )
    } else {
      const observation: object = existence
      exists = Reflect.get(observation, 'exists')
      if (typeof exists !== 'boolean') {
        fieldMismatch(exists, [...existencePath, 'exists'], issues, 'a boolean')
      }
      const rawObservedAt: unknown = Reflect.get(observation, 'observedAt')
      observedAt =
        rawObservedAt === undefined
          ? fieldMismatch(rawObservedAt, [...existencePath, 'observedAt'], issues, 'a Date')
          : DATE_CODEC.encode(rawObservedAt, [...existencePath, 'observedAt'], issues)
    }

    if (
      !valid ||
      typeof grant !== 'string' ||
      filePath === INVALID ||
      typeof exists !== 'boolean' ||
      observedAt === INVALID
    ) {
      return INVALID
    }
    const payload = { exists, observedAt, grant }
    return { file: filePath === undefined ? payload : { path: filePath, ...payload } }
  },

  decode(wire, path, context, issues) {
    const payload = controlPayload(wire, 'file', path, issues, FILE_EXAMPLE)
    if (payload === INVALID) return INVALID
    const source = openWireObject(payload)
    if (source === undefined) {
      issues.push(
        issue(
          path,
          'invalid-control-record',
          `A file payload must be an object {path?, exists, observedAt, grant}; received ${describeReceived(payload)}.`
        )
      )
      return INVALID
    }
    const read = (key: string): unknown => source.read(key)

    const unknown = source.rejectUnknown(FILE_WIRE_FIELDS, path, issues)
    const filePath = readOptionalPath(read('path'), path, issues)
    const exists = read('exists')
    if (typeof exists !== 'boolean') {
      fieldMismatch(exists, [...path, 'existence', 'exists'], issues, 'a boolean')
    }
    const observedAtPath = [...path, 'existence', 'observedAt']
    const rawObservedAt = read('observedAt')
    const observedAt =
      rawObservedAt === undefined
        ? fieldMismatch(rawObservedAt, observedAtPath, issues, 'a date control record')
        : DATE_CODEC.decode(rawObservedAt, observedAtPath, context, issues)
    const grant = readText(
      read('grant'),
      [...path, 'grant'],
      issues,
      'a fetch grant (non-empty text)'
    )

    if (
      unknown ||
      filePath === INVALID ||
      typeof exists !== 'boolean' ||
      observedAt === INVALID ||
      grant === INVALID
    ) {
      return INVALID
    }
    return context.bindFile(fileData(filePath, exists, observedAt, grant))
  },
}

/** Read a caller-owned file's path: required, non-empty text. */
function readFilePath(source: FieldReader, path: IssuePath, issues: Issues): string | Invalid {
  return readText(source.read('path'), [...path, 'path'], issues, 'a file path (non-empty text)')
}

/** Read an uploaded file's id: required, non-empty text. */
function readUploadId(source: FieldReader, path: IssuePath, issues: Issues): string | Invalid {
  const raw = source.read('uploadId')
  return readText(raw, [...path, 'uploadId'], issues, 'an upload id (non-empty text)')
}

/** Record an issue for a file source `kind` that is absent, mistyped, or unknown. */
function fileSourceKindIssue(kind: unknown, path: IssuePath, issues: Issues): Invalid {
  if (typeof kind !== 'string') {
    return fieldMismatch(
      kind,
      [...path, 'kind'],
      issues,
      `the file source kind ${FILE_SOURCE_KINDS}`
    )
  }
  issues.push(
    issue(
      [...path, 'kind'],
      'unknown-enum-member',
      `Expected the file source kind ${FILE_SOURCE_KINDS}; received ${quote(kind)}.`
    )
  )
  return INVALID
}

/** Codec for file sources: encode both kinds, decode only caller-owned files. */
const FILE_SOURCE_CODEC: Codec<FileSource> = {
  encode(value, path, issues) {
    // Any object, read by property access under the declared-fields rule, so
    // an uploaded file returned as a class instance with accessors encodes.
    const source = openSdkObject(value)
    if (source === undefined) return mismatch(value, path, issues, FILE_SOURCE_EXPECTED)
    const kind = source.read('kind')
    switch (kind) {
      case 'caller-owned-file': {
        const filePath = readFilePath(source, path, issues)
        const unknown = source.rejectUnknown(CALLER_OWNED_FIELDS, path, issues)
        if (filePath === INVALID || unknown) return INVALID
        return { fileSource: { kind, path: filePath } }
      }
      case 'uploaded-file': {
        const uploadId = readUploadId(source, path, issues)
        // The expiry is validated as the SDK value requires, but is not sent:
        // the service's transfer store is authoritative for it.
        const expiresAt = source.read('expiresAt')
        const expiry =
          expiresAt === undefined
            ? fieldMismatch(expiresAt, [...path, 'expiresAt'], issues, 'a Date')
            : DATE_CODEC.encode(expiresAt, [...path, 'expiresAt'], issues)
        const unknown = source.rejectUnknown(UPLOADED_SDK_FIELDS, path, issues)
        if (uploadId === INVALID || expiry === INVALID || unknown) return INVALID
        return { fileSource: { kind, uploadId } }
      }
      default:
        return fileSourceKindIssue(kind, path, issues)
    }
  },

  decode(wire, path, _context, issues) {
    const payload = controlPayload(wire, 'fileSource', path, issues, FILE_SOURCE_EXAMPLE)
    if (payload === INVALID) return INVALID
    const source = openWireObject(payload)
    if (source === undefined) {
      issues.push(
        issue(
          path,
          'invalid-control-record',
          `A file source payload must be an object with a "kind"; received ${describeReceived(payload)}.`
        )
      )
      return INVALID
    }
    const kind = source.read('kind')
    switch (kind) {
      case 'caller-owned-file': {
        const filePath = readFilePath(source, path, issues)
        const unknown = source.rejectUnknown(CALLER_OWNED_FIELDS, path, issues)
        if (filePath === INVALID || unknown) return INVALID
        return { kind, path: filePath }
      }
      case 'uploaded-file':
        // Malformed keys are reported too, so the issues describe the payload
        // fully, but an upload handle never decodes.
        source.rejectUnknown(UPLOADED_WIRE_FIELDS, path, issues)
        issues.push(issue(path, 'unsupported', UPLOAD_DECODE_MESSAGE))
        return INVALID
      default:
        return fileSourceKindIssue(kind, path, issues)
    }
  },
}

/** Build `t.file()`; see `ValueTypeConstructors.file`. */
export function fileType(options?: ValueTypeOptions): ValueType<FileValue> {
  return defineValueType(
    { plan: { kind: 'file' }, sdk: FILE_SDK_SCHEMA, wire: FILE_WIRE_SCHEMA, codec: FILE_CODEC },
    options?.description
  )
}

/** Build `t.fileSource()`; see `ValueTypeConstructors.fileSource`. */
export function fileSourceType(options?: ValueTypeOptions): ValueType<FileSource> {
  return defineValueType(
    {
      plan: { kind: 'file-source' },
      sdk: FILE_SOURCE_SDK_SCHEMA,
      wire: FILE_SOURCE_WIRE_SCHEMA,
      codec: FILE_SOURCE_CODEC,
    },
    options?.description
  )
}
