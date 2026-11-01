/**
 * Type tests for file values and transfer handles.
 *
 * Each locality-specific handle is distinguished by `kind`, so code that
 * handles a fetched file or a write source narrows exhaustively.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  CallerOwnedFile,
  FetchedFile,
  FileSource,
  FileValue,
  SignedDownload,
  TemporaryFileCopy,
  UploadedFile,
} from '../index.js'

declare const file: FileValue

// Fetching yields one of the locality-specific read handles.
expectType<Promise<FetchedFile>>(file.fetch())

declare const fetched: FetchedFile
if (fetched.kind === 'temporary-copy') {
  expectType<TemporaryFileCopy>(fetched)
  expectType<Promise<void>>(fetched.release())
} else {
  expectType<SignedDownload>(fetched)
  expectType<Date>(fetched.expiresAt)
}

declare const source: FileSource
if (source.kind === 'caller-owned-file') {
  expectType<CallerOwnedFile>(source)
  expectType<string>(source.path)
} else {
  expectType<UploadedFile>(source)
  expectType<string>(source.uploadId)
}

// Negative: a bare path is not a write source; the caller must say which kind.
expectNotAssignable<FileSource>({ path: '/Users/me/report.pdf' })
expectAssignable<FileSource>({ kind: 'caller-owned-file', path: '/Users/me/report.pdf' })

// Edge: a read handle is not a write source.
expectNotAssignable<FileSource>(fetched)
