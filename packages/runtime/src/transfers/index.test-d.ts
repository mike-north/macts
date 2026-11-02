/**
 * Type tests for the transfer store's public surface.
 *
 * They pin what the compiler accepts: which byte sources an upload takes,
 * that limits are read-only and overridable one at a time, and that optional
 * facts (a granted file's path, an upload's content type) are optional rather
 * than possibly-undefined.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  ConsumedUpload,
  CreateTransferStoreOptions,
  DownloadLinkTarget,
  FileGrantRecord,
  GrantedFile,
  TransferLimits,
  TransferStore,
  UploadByteSource,
} from './index.js'
import { createTransferStore } from './index.js'

declare const store: TransferStore
declare const grant: FileGrantRecord
declare const consumed: ConsumedUpload

expectType<Promise<TransferStore>>(createTransferStore())

// Byte sources: web streams and async iterables of byte chunks. (Node.js
// streams are async iterables too, but how their iterator is typed depends on
// the Node.js type definitions in use, so uploads.test.ts covers them at run
// time instead.)
expectAssignable<UploadByteSource>(new ReadableStream<Uint8Array>())
declare const buffers: AsyncIterable<Buffer>
expectAssignable<UploadByteSource>(buffers)
declare const generator: AsyncGenerator<Uint8Array>
expectAssignable<UploadByteSource>(generator)
expectNotAssignable<UploadByteSource>(['not', 'a', 'stream'])
declare const strings: AsyncIterable<string>
expectNotAssignable<UploadByteSource>(strings)

// Limits are overridable one at a time and read-only.
expectAssignable<CreateTransferStoreOptions>({ limits: { maxUploadBytes: 10 } })
expectNotAssignable<CreateTransferStoreOptions>({ limits: { maxUploadBytes: '10' } })
declare const limits: TransferLimits
// @ts-expect-error -- limits are read-only
limits.maxUploadBytes = 1

// A granted file's path is optional, never explicitly undefined.
expectAssignable<GrantedFile>({ app: 'photos', observedAt: new Date() })
expectNotAssignable<GrantedFile>({ app: 'photos', path: undefined, observedAt: new Date() })
expectType<Promise<FileGrantRecord>>(store.redeemGrant('subject', 'token'))
expectType<string | undefined>(grant.path)

// A consumed upload is released asynchronously.
expectType<Promise<void>>(consumed.release())
expectType<string | undefined>(consumed.contentType)

// Redeeming a download link takes only the token: it is the capability.
expectType<Promise<DownloadLinkTarget>>(store.redeemDownloadLink('token'))
