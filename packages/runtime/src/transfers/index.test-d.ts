/**
 * Type tests for the transfer store's public surface.
 *
 * They pin what the compiler accepts: that limits are read-only and
 * overridable one at a time, and that a granted file's path is optional
 * rather than possibly-undefined.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectNotType, expectType } from 'tsd'
import type {
  CreateTransferStoreOptions,
  DownloadLinkTarget,
  FileGrantRecord,
  GrantedFile,
  TransferLimits,
  TransferStore,
} from './index.js'
import { createTransferStore } from './index.js'

declare const store: TransferStore
declare const grant: FileGrantRecord

expectType<Promise<TransferStore>>(createTransferStore())

// Limits are overridable one at a time and read-only.
expectAssignable<CreateTransferStoreOptions>({ limits: { maxUploadBytes: 10 } })
expectNotAssignable<CreateTransferStoreOptions>({ limits: { maxUploadBytes: '10' } })
// Every bound is read-only. Readonly-ness does not affect assignability, so
// it is checked with tsd's identity assertions: TransferLimits is identical
// to its Readonly form and not to its mutable form.
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
declare const limits: TransferLimits
expectType<Readonly<TransferLimits>>(limits)
expectNotType<Mutable<TransferLimits>>(limits)

// A granted file's path is optional, never explicitly undefined.
expectAssignable<GrantedFile>({ app: 'photos', observedAt: new Date() })
expectNotAssignable<GrantedFile>({ app: 'photos', path: undefined, observedAt: new Date() })
expectType<Promise<FileGrantRecord>>(store.redeemGrant('subject', 'token'))
expectType<string | undefined>(grant.path)

// Redeeming a download link takes only the token: it is the capability.
expectType<Promise<DownloadLinkTarget>>(store.redeemDownloadLink('token'))
