/**
 * Files and binary transfer handles.
 *
 * One public abstraction, {@link FileValue}, represents a file or binary
 * content that an operation returned: a path on the executing Mac when one
 * exists, an observation of existence, and a common fetch operation. Fetching
 * and writing differ by locality, and the handle types keep each case distinct:
 *
 * | Case | Local mode | Remote mode |
 * | --- | --- | --- |
 * | Read bytes | {@link TemporaryFileCopy} | {@link SignedDownload} |
 * | Write bytes | {@link CallerOwnedFile} | {@link UploadedFile} (after POSTing to an {@link UploadTarget}) |
 *
 * Paths always refer to the executing Mac. A path never causes an implicit
 * upload. Bytes never travel inline in tool or model content; only these
 * handles do.
 *
 * @packageDocumentation
 */

import type { CallOptions } from '../call-options.js'
import type { Integer } from '../values/integer.js'
import type { WireDate } from '../values/wire.js'

/**
 * Whether a file existed when it was last checked.
 *
 * @remarks
 * An observation, not a guarantee: the file can appear or disappear afterwards,
 * and fetching a file that has disappeared fails with a file-not-found error.
 */
export interface ExistenceObservation {
  /** Whether the file existed at `observedAt`. */
  readonly exists: boolean
  /** When the observation was made. */
  readonly observedAt: Date
}

/**
 * A file or binary content returned by an operation.
 *
 * @remarks
 * `path`, when present, is the original path on the executing Mac. Content
 * without a path (binary data held by the app) is still fetchable. Fetching is
 * authorized: it requires the invocation's credential and is limited to
 * content an authorized operation returned.
 */
export interface FileValue {
  /** The original path on the executing Mac, when the content has one. */
  readonly path?: string
  /** Whether the file existed when the operation observed it. */
  readonly existence: ExistenceObservation
  /** Deliver the content outside the value itself; see {@link FetchedFile}. */
  fetch(options?: CallOptions): Promise<FetchedFile>
}

/**
 * The decoded payload of a file value: what a client's file binder receives.
 *
 * @remarks
 * Decoding a `file` wire value yields this data, with `observedAt` as a
 * `Date`, and passes it to `DecodeContext.bindFile`. The binder keeps `grant`
 * in a closure that its {@link FileValue.fetch} uses; the grant never appears
 * on the `FileValue`, enumerable or otherwise, so serializing, inspecting, or
 * logging a file value cannot reveal it.
 *
 * It is also what the runtime encodes when an operation returns a file. File
 * values are outputs only: a value without a grant, such as a bound
 * `FileValue`, cannot be encoded.
 */
export interface FileData {
  /** The original path on the executing Mac, when the content has one. */
  readonly path?: string
  /** Whether the file existed when the operation observed it. */
  readonly existence: ExistenceObservation
  /** Opaque, expiring fetch grant issued by the runtime for an authorized result. */
  readonly grant: string
}

/**
 * Local read result: a temporary copy of the content on the executing Mac.
 *
 * @remarks
 * The caller owns the copy once `fetch()` resolves and should `release()` it
 * when done; the runtime also removes leftover copies after a bounded,
 * documented lifetime.
 */
export interface TemporaryFileCopy {
  /** Handle kind. */
  readonly kind: 'temporary-copy'
  /** Path of the temporary copy. */
  readonly path: string
  /** Delete the temporary copy. Safe to call more than once. */
  release(): Promise<void>
}

/**
 * Remote read result: a short-lived signed HTTP URL that delivers the content.
 *
 * @remarks
 * The URL is a bearer capability for this one transfer, valid until
 * `expiresAt`. A fresh `fetch()` issues a fresh URL. It is never logged.
 */
export interface SignedDownload {
  /** Handle kind. */
  readonly kind: 'signed-download'
  /** The signed download URL. */
  readonly url: string
  /** When the URL stops working. */
  readonly expiresAt: Date
}

/** The result of fetching a {@link FileValue}, by locality. */
export type FetchedFile = TemporaryFileCopy | SignedDownload

/**
 * Local write source: an existing file on the executing Mac, written by the
 * caller.
 *
 * @remarks
 * The caller owns the file. macts reads it and never moves or deletes it. No
 * upload slot is allocated in local mode.
 */
export interface CallerOwnedFile {
  /** Handle kind. */
  readonly kind: 'caller-owned-file'
  /** Path of the file on the executing Mac. */
  readonly path: string
}

/**
 * Remote write source: the reference returned once bytes have been fully
 * uploaded to the service.
 *
 * @remarks
 * Usable by an operation until it is consumed or expires. An expired or
 * incomplete upload fails with a transfer error and never reaches the app.
 */
export interface UploadedFile {
  /** Handle kind. */
  readonly kind: 'uploaded-file'
  /** Service-assigned identifier of the completed upload. */
  readonly uploadId: string
  /** When the upload can no longer be used. */
  readonly expiresAt: Date
}

/** A source of bytes for an operation that writes a file. */
export type FileSource = CallerOwnedFile | UploadedFile

/**
 * Where a remote caller POSTs bytes before writing them to an app.
 *
 * @remarks
 * Issued by the service for one upload. Bytes beyond `maxBytes`, or sent after
 * `expiresAt`, are rejected.
 */
export interface UploadTarget {
  /** The upload URL. */
  readonly url: string
  /** When the upload URL stops accepting bytes. */
  readonly expiresAt: Date
  /** Largest accepted upload, in bytes. */
  readonly maxBytes: Integer
}

/**
 * Wire form of a {@link FileValue}: the payload of a `file` control record.
 *
 * @remarks
 * `grant` is an opaque, expiring token issued when an authorized operation
 * returned the file. It is bound to the authority that received it and is
 * exchanged, together with the caller's credential, to fetch the content.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- a type alias, so `WireFile` is assignable to `WireValue`
export type FileWire = {
  /** The original path on the executing Mac, when there is one. */
  readonly path?: string
  /** Whether the file existed when observed. */
  readonly exists: boolean
  /** When existence was observed. */
  readonly observedAt: WireDate
  /** Opaque fetch grant. */
  readonly grant: string
}

/**
 * Wire form of a {@link FileSource}: the payload of a `fileSource` control
 * record.
 *
 * @remarks
 * An uploaded file travels as its `uploadId` only. The SDK value's
 * `expiresAt` is not sent, because an expiry asserted by the caller would be
 * untrusted: the service's transfer store is authoritative for expiry and
 * completion.
 */
export type FileSourceWire =
  | { readonly kind: 'caller-owned-file'; readonly path: string }
  | { readonly kind: 'uploaded-file'; readonly uploadId: string }
