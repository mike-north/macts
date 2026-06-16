/**
 * Audit-record writer (JSON-lines format).
 *
 * Appends serialised {@link AuditRecord} instances to a file, one JSON object
 * per line (the JSON-lines / NDJSON convention). Each call to
 * {@link AuditWriter.append} performs a best-effort, newline-terminated append
 * of a single serialised record via `fs.appendFile`. Strict write atomicity and
 * concurrency guarantees are NOT provided here: `fs.appendFile` does not
 * guarantee that concurrent appends from multiple writers (or processes) are
 * interleaved cleanly, so callers that require those guarantees must add their
 * own serialisation (e.g. a queue or external lock).
 *
 * ## Layering invariant
 *
 * This module uses only `node:fs/promises` and `node:path`. It accepts the
 * **destination path as an explicit parameter** — it never resolves a home
 * directory, reads `MACTS_HOME`, or calls any `@macts/api` code. Wiring a
 * conventional default path (e.g. `~/.macts/audit.jsonl`) is the
 * responsibility of the caller (typically `@macts/api` or the CLI layer, which
 * is out of scope here).
 *
 * ## Error handling
 *
 * Errors from the underlying filesystem calls are surfaced to the caller — they
 * are never silently swallowed. The caller decides whether to retry, alert, or
 * degrade gracefully.
 *
 * @packageDocumentation
 */

import { mkdir, appendFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { serializeAuditRecord } from './audit.js'
import type { AuditRecord } from './audit.js'

/**
 * A sink for {@link AuditRecord} instances.
 *
 * Implementations must append one complete, newline-terminated JSON object per
 * call and must surface I/O errors rather than swallowing them.
 */
export interface AuditWriter {
  /**
   * Append a single audit record to the sink.
   *
   * @param record - The record to persist.
   * @returns A promise that resolves once the record has been appended (handed
   *   off to the underlying write). It does NOT `fsync`, so resolution does not
   *   guarantee the bytes have been flushed to durable storage.
   * @throws If the underlying I/O operation fails.
   */
  append(record: AuditRecord): Promise<void>
}

/**
 * Create an {@link AuditWriter} that appends to a JSON-lines file at the given
 * absolute path.
 *
 * Parent directories are created automatically on first use (equivalent to
 * `mkdir -p`). Each call to `append` serialises the record via
 * {@link serializeAuditRecord}, JSON-encodes the result, appends it with a
 * trailing newline, and resolves. Errors are propagated to the caller.
 *
 * The destination path is accepted as-is — no home-directory expansion, no
 * environment-variable lookup. Callers are responsible for supplying an
 * absolute path.
 *
 * @param path - Absolute path to the JSON-lines audit log file.
 * @returns An {@link AuditWriter} that appends to `path`.
 *
 * @example
 * ```typescript
 * const writer = createFileAuditWriter('/var/log/macts/audit.jsonl')
 * await writer.append(record)
 * ```
 */
export function createFileAuditWriter(path: string): AuditWriter {
  return {
    async append(record: AuditRecord): Promise<void> {
      // Ensure the parent directory exists before every write so the writer
      // works even if the directory is created after the writer is constructed.
      await mkdir(dirname(path), { recursive: true })
      const line = JSON.stringify(serializeAuditRecord(record)) + '\n'
      await appendFile(path, line, { encoding: 'utf8' })
    },
  }
}
