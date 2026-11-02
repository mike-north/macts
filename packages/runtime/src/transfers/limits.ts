/**
 * Size limits and lifetimes for binary transfers (phases/13, D8 "Limits and
 * lifecycle").
 *
 * Every limit bounds something a remote caller can make the service hold on
 * disk or honor later: bytes, outstanding uploads, and capabilities (grants
 * and download links). Lifetimes are measured from the store's clock, and a
 * transfer is usable strictly before its expiry instant: at `expiresAt` it is
 * already expired.
 *
 * The named constants are the defaults. A store can be opened with overrides
 * (tests use this to exercise the bounds without moving hundreds of
 * megabytes); {@link resolveTransferLimits} validates them.
 *
 * @packageDocumentation
 */

const MIB = 1024 * 1024
const MINUTE_MS = 60_000

/**
 * Largest single upload, in bytes: 100 MiB.
 *
 * @remarks
 * Large enough for the documents, images, and attachments apps exchange,
 * small enough that one upload cannot fill the disk of the Mac it is staged
 * on. An upload that exceeds it fails with `TransferError` `too-large` and
 * its partial bytes are deleted.
 */
export const MAX_UPLOAD_BYTES = 100 * MIB

/**
 * Most uploads one subject can have outstanding at once: 16.
 *
 * @remarks
 * An upload is outstanding from creation until it is consumed or expires.
 * The bound keeps one caller from reserving unbounded upload slots; enough
 * for an operation that writes several files plus a few retries. Creating
 * another fails with `RateLimitedError`, whose `retryAfterSeconds` says when
 * the subject's oldest outstanding upload expires.
 */
export const MAX_OUTSTANDING_UPLOADS_PER_SUBJECT = 16

/**
 * Most bytes one subject can have received across its outstanding uploads:
 * 512 MiB.
 *
 * @remarks
 * Smaller than {@link MAX_OUTSTANDING_UPLOADS_PER_SUBJECT} times
 * {@link MAX_UPLOAD_BYTES} on purpose: a caller may stage a few large files or
 * many small ones, but never 1.6 GiB at once. A write that would exceed it
 * fails with `TransferError` `too-large`, and its partial bytes are deleted.
 *
 * Only outstanding uploads count: bytes of uploads that have expired but
 * not yet been swept, and of consumed uploads not yet released, do not. So
 * the bytes a subject has on disk are bounded but can briefly exceed this
 * budget, until the next sweep (at most a minute after expiry, given
 * activity) or the end of {@link CONSUMED_UPLOAD_RETENTION_MS}. A receive in
 * progress counts in steps of up to 1 MiB, so a concurrent receive by the
 * same subject may be refused up to that much early.
 */
export const MAX_OUTSTANDING_UPLOAD_BYTES_PER_SUBJECT = 512 * MIB

/**
 * How long an upload accepts bytes and can be consumed: 15 minutes from its
 * creation.
 *
 * @remarks
 * Long enough to send {@link MAX_UPLOAD_BYTES} over a slow link and then make
 * the call that uses it; short enough that abandoned uploads free their slot
 * and their disk space soon.
 */
export const UPLOAD_TTL_MS = 15 * MINUTE_MS

/**
 * How long the bytes of a consumed upload are kept when the consuming call
 * never releases them: 15 minutes from consumption.
 *
 * @remarks
 * The consuming call releases the bytes as soon as it finishes, on success or
 * failure. This bound only applies when that never happens (the process
 * ended mid-call). It outlasts any operation's time budget, so the sweep
 * never deletes bytes an operation is still reading.
 */
export const CONSUMED_UPLOAD_RETENTION_MS = 15 * MINUTE_MS

/**
 * How long a file grant can be exchanged for the file: 15 minutes from issue.
 *
 * @remarks
 * A grant is issued when an authorized operation returns a file. Fifteen
 * minutes covers an agent that inspects a result before fetching it, while
 * keeping a leaked grant useless soon. A grant is reusable until it expires,
 * and only the subject it was issued to can use it.
 */
export const FILE_GRANT_TTL_MS = 15 * MINUTE_MS

/**
 * How long a download link delivers the file: 5 minutes from issue.
 *
 * @remarks
 * A download link is a bearer capability, so its lifetime is the shortest of
 * all: enough to start the download it was issued for. Fetching again issues
 * a fresh link.
 */
export const DOWNLOAD_LINK_TTL_MS = 5 * MINUTE_MS

/**
 * How long a temporary copy may remain after the caller stops using it:
 * 60 minutes from registration.
 *
 * @remarks
 * The caller owns a temporary copy and should release it when done. This
 * bound only removes leftovers. It is longer than the other lifetimes because
 * a local caller reads the copy directly and may hold it while it works.
 */
export const TEMPORARY_COPY_TTL_MS = 60 * MINUTE_MS

/**
 * The bounds a transfer store enforces. Byte limits are in bytes, lifetimes
 * in milliseconds.
 */
export interface TransferLimits {
  /** Largest single upload. Default {@link MAX_UPLOAD_BYTES}. */
  readonly maxUploadBytes: number
  /** Most outstanding uploads per subject. Default {@link MAX_OUTSTANDING_UPLOADS_PER_SUBJECT}. */
  readonly maxOutstandingUploadsPerSubject: number
  /** Most bytes received across a subject's outstanding uploads. Default {@link MAX_OUTSTANDING_UPLOAD_BYTES_PER_SUBJECT}. */
  readonly maxOutstandingUploadBytesPerSubject: number
  /** Upload lifetime. Default {@link UPLOAD_TTL_MS}. */
  readonly uploadTtlMs: number
  /** How long unreleased bytes of a consumed upload are kept. Default {@link CONSUMED_UPLOAD_RETENTION_MS}. */
  readonly consumedUploadRetentionMs: number
  /** File grant lifetime. Default {@link FILE_GRANT_TTL_MS}. */
  readonly fileGrantTtlMs: number
  /** Download link lifetime. Default {@link DOWNLOAD_LINK_TTL_MS}. */
  readonly downloadLinkTtlMs: number
  /** Temporary copy lifetime. Default {@link TEMPORARY_COPY_TTL_MS}. */
  readonly temporaryCopyTtlMs: number
}

/**
 * The default bounds, assembled from the named constants.
 */
export const DEFAULT_TRANSFER_LIMITS: Readonly<TransferLimits> = Object.freeze({
  maxUploadBytes: MAX_UPLOAD_BYTES,
  maxOutstandingUploadsPerSubject: MAX_OUTSTANDING_UPLOADS_PER_SUBJECT,
  maxOutstandingUploadBytesPerSubject: MAX_OUTSTANDING_UPLOAD_BYTES_PER_SUBJECT,
  uploadTtlMs: UPLOAD_TTL_MS,
  consumedUploadRetentionMs: CONSUMED_UPLOAD_RETENTION_MS,
  fileGrantTtlMs: FILE_GRANT_TTL_MS,
  downloadLinkTtlMs: DOWNLOAD_LINK_TTL_MS,
  temporaryCopyTtlMs: TEMPORARY_COPY_TTL_MS,
})

/**
 * Merge overrides onto the defaults, rejecting any bound that is not a
 * positive safe integer: a zero, negative, fractional, or non-finite bound
 * would make every transfer fail, or none expire.
 *
 * @throws RangeError naming the first invalid bound.
 */
export function resolveTransferLimits(overrides: Partial<TransferLimits> = {}): TransferLimits {
  const limits: TransferLimits = { ...DEFAULT_TRANSFER_LIMITS, ...overrides }
  for (const [name, value] of Object.entries(limits)) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(
        `Transfer limit ${name} must be a positive integer (received ${String(value)}).`
      )
    }
  }
  return limits
}
