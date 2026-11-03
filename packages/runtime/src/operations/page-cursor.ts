/**
 * The continuation cursor of a paged list: what it holds, how it is written,
 * and how a presented cursor is checked against the call that presents it.
 *
 * A cursor is opaque to callers and stateless on the service: nothing is
 * stored when one is issued, it is not signed, and it never expires. It
 * carries no authority, because every page runs the full invocation pipeline
 * (credential, permission, governance, validation) like any other call; a
 * forged cursor can only name a position in a listing the caller may already
 * read. What it does carry is enough to continue exactly and to refuse to
 * continue anything else:
 *
 * - a format version, so a cursor from another format is refused rather than
 *   misread;
 * - the operation id, so a cursor works only with the operation that issued
 *   it;
 * - a digest of the call's other inputs (its parent scope and any other
 *   input), and a separate slot for a digest of filter inputs, empty until
 *   list operations take filters, so a cursor works only with the inputs that
 *   produced it;
 * - the offset of the next page, and the anchor: the identifier of the last
 *   item the previous page returned, which the executor checks still sits just
 *   before that offset (see `PageWindow` in `@macts/core`).
 *
 * The anchor can be user content (an item's name, for an app that identifies
 * items by name). A cursor's contents therefore never appear in an error
 * message, an issue, a log entry, or an audit record; those say only that a
 * cursor was presented.
 *
 * @packageDocumentation
 */

import { createHash } from 'node:crypto'
import {
  ValidationError,
  type OperationId,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import type { PageAnchor } from '@macts/core'

/** The format version this module writes and the only one it reads. */
const CURSOR_VERSION = '1'

/** The digest that fills the filter slot while no list operation takes filters. */
const NO_FILTERS_DIGEST = ''

/** How many bytes of the SHA-256 digest of the inputs a cursor keeps (128 bits). */
const INPUT_DIGEST_BYTES = 16

/** Where a cursor continues a listing, as the executor's page window needs it. */
export interface CursorPosition {
  /** Position of the first item of the next page; at least 1. */
  readonly offset: number
  /** The identifier of the item at `offset - 1` when the cursor was issued. */
  readonly anchor: PageAnchor
}

/** Everything a cursor is issued for. */
export interface CursorBinding {
  /** The operation that issued the cursor. */
  readonly operation: OperationId
  /** The call's inputs other than the paging inputs, in wire form. */
  readonly inputs: WireRecord
}

/** The payload a cursor carries, as written in its JSON. */
interface CursorPayload {
  /** The operation id. */
  readonly op: string
  /** The digest of the non-paging inputs. */
  readonly in: string
  /** The digest of the filter inputs; empty while there are none. */
  readonly fl: string
  /** The offset of the next page. */
  readonly at: number
  /** The anchor: the last returned item's identifier. */
  readonly an: PageAnchor
}

/**
 * Write the cursor that continues a listing after a page.
 *
 * @param binding - The operation and the call's non-paging inputs.
 * @param position - The next page's offset and its anchor.
 * @returns `<version>.<payload>`, the payload being base64url-encoded JSON.
 */
export function encodePageCursor(binding: CursorBinding, position: CursorPosition): string {
  const payload: CursorPayload = {
    op: binding.operation,
    in: inputDigest(binding.inputs),
    fl: NO_FILTERS_DIGEST,
    at: position.offset,
    an: position.anchor,
  }
  return `${CURSOR_VERSION}.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`
}

/**
 * Read a presented cursor and check it against the call presenting it.
 *
 * @param cursor - The cursor exactly as the caller sent it.
 * @param binding - The operation called and the call's non-paging inputs.
 * @returns Where the cursor continues the listing.
 * @throws `ValidationError` with one issue at `["cursor"]` when the cursor is
 *   malformed, has a format version this service does not read, was issued by
 *   another operation, or was issued for other inputs. Neither the message nor
 *   the issue repeats the cursor or anything decoded from it.
 */
export function decodePageCursor(cursor: string, binding: CursorBinding): CursorPosition {
  const separator = cursor.indexOf('.')
  const version = separator < 0 ? undefined : cursor.slice(0, separator)
  if (version === undefined || !/^[0-9]+$/.test(version)) {
    throw cursorRejected(MALFORMED)
  }
  if (version !== CURSOR_VERSION) {
    throw cursorRejected('The cursor was written in a format this service does not read.')
  }
  const payload = parsePayload(cursor.slice(separator + 1))
  if (payload === undefined) throw cursorRejected(MALFORMED)
  if (payload.op !== binding.operation) {
    throw cursorRejected(
      'The cursor was issued by a different operation; send it only to the operation that returned it.'
    )
  }
  if (payload.in !== inputDigest(binding.inputs) || payload.fl !== NO_FILTERS_DIGEST) {
    throw cursorRejected(
      'The cursor was issued for different inputs; send it with the same inputs as the call that returned it.'
    )
  }
  return { offset: payload.at, anchor: payload.an }
}

/** The issue for a cursor that is not one this service wrote. */
const MALFORMED = 'The cursor is not one this service issued.'

/** The rejection of a presented cursor, with its one issue at `["cursor"]`. */
function cursorRejected(reason: string): ValidationError {
  return new ValidationError(
    'The cursor cannot continue this listing. Send the same inputs as the call that returned it, or start again without a cursor.',
    { issues: [{ path: ['cursor'], message: reason }] }
  )
}

/** The payload of a cursor, or `undefined` when it is not a well-formed payload. */
function parsePayload(encoded: string): CursorPayload | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
  const keys = Object.keys(parsed).sort()
  if (keys.join(',') !== 'an,at,fl,in,op') return undefined
  const record = parsed as Readonly<Record<string, unknown>>
  const { op, in: inputs, fl, at, an } = record
  if (typeof op !== 'string' || typeof inputs !== 'string' || typeof fl !== 'string') {
    return undefined
  }
  if (typeof at !== 'number' || !Number.isSafeInteger(at) || at < 1) return undefined
  if (!(typeof an === 'string' || (typeof an === 'number' && Number.isFinite(an)))) {
    return undefined
  }
  return { op, in: inputs, fl, at, an }
}

/**
 * The digest of a call's non-paging inputs: SHA-256 over their canonical
 * JSON (object keys sorted at every level), truncated to
 * {@link INPUT_DIGEST_BYTES} and base64url-encoded.
 *
 * The runtime passes the call's input after validating it against the
 * operation's wire contract, with the paging inputs removed. Wire values have
 * one spelling per value (integers, for example, are canonical decimal text),
 * so equal inputs give equal digests whatever surface sent them (an SDK's
 * encoded input, an HTTP body, an MCP tool call) and whatever order their
 * keys arrived in: a cursor issued through one surface continues through any
 * other.
 *
 * The digest is a consistency check that the caller sent the same query
 * again, not a security control: it is unkeyed, anyone can compute it, and a
 * cursor carries no authority (every page runs the full invocation pipeline).
 */
function inputDigest(inputs: WireRecord): string {
  return createHash('sha256')
    .update(canonicalJson(inputs))
    .digest()
    .subarray(0, INPUT_DIGEST_BYTES)
    .toString('base64url')
}

/** Whether a wire value is an array; `Array.isArray` does not narrow readonly arrays. */
function isWireArray(value: WireValue): value is readonly WireValue[] {
  return Array.isArray(value)
}

/** JSON text of `value` with object keys sorted at every level. */
function canonicalJson(value: WireValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (isWireArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value
  const entries = Object.keys(record)
    .sort()
    .flatMap((key) => {
      const entry = record[key]
      return entry === undefined ? [] : [`${JSON.stringify(key)}:${canonicalJson(entry)}`]
    })
  return `{${entries.join(',')}}`
}
