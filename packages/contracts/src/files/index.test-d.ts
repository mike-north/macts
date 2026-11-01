/**
 * Type tests for file values and transfer handles.
 *
 * Each locality-specific handle is distinguished by `kind`, so code that
 * handles a fetched file or a write source narrows exhaustively. A bound file
 * value never exposes its fetch grant; only the decoded file data that a
 * binder receives carries it.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D8 (Binary Transfer Handle Shapes)
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  CallerOwnedFile,
  ExistenceObservation,
  FetchedFile,
  FileData,
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

// A file value has no grant property; only the decoded file data does.
expectType<false>(null as unknown as 'grant' extends keyof FileValue ? true : false)
expectType<string>(null as unknown as FileData['grant'])
expectType<ExistenceObservation>(null as unknown as FileData['existence'])
expectType<string | undefined>(null as unknown as FileData['path'])

// Negative: file data is not a bound file value (it cannot fetch), and a bound
// file value is not file data (it has no grant to encode).
declare const data: FileData
expectNotAssignable<FileValue>(data)
expectNotAssignable<FileData>(file)
