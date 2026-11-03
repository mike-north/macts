/**
 * Type tests for resolving references a client decoded.
 *
 * phases/13 D7 fixes the results: `resolve()` on a single-object reference
 * yields the record, `Promise<T>`, and on a collection reference an array of
 * records, `Promise<readonly T[]>`, at every level a client binds (a
 * reference, its container, and an identity-collection entry). The client
 * runtime's own `resolve` takes the data form of any reference and yields
 * `unknown`, because the contract, not the call site, knows the record type.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D7)
 */

import { expectNotAssignable, expectType } from 'tsd'
import type {
  ClientRuntime,
  IdentityReference,
  ObjectReferenceVariant,
  ReferenceData,
} from '@macts/contracts'
import type { Book, LibraryClient, Shelf } from './library-fixture.js'
import * as remote from './index.js'

declare const client: LibraryClient
declare const runtime: ClientRuntime
declare const reference: ReferenceData
declare const book: Book

// An operation result is decoded into the record type, references bound.
expectType<Promise<Book>>(client.books.get())

// A decoded record's references resolve to their records' types.
expectType<Promise<Shelf>>(book.shelf.resolve())
expectType<Promise<readonly Book[]>>(book.sequels.resolve())

// Containers and entries are bound too.
expectType<ObjectReferenceVariant<unknown> | undefined>(book.shelf.container)
expectType<Promise<unknown> | undefined>(book.shelf.container?.resolve())
if (book.sequels.form === 'identity') {
  const [entry] = book.sequels.entries
  expectType<IdentityReference<Book, string, 'Book'> | undefined>(entry)
  expectType<Promise<Book> | undefined>(entry?.resolve())
}

// A single reference does not resolve to an array, nor a collection to one record.
expectNotAssignable<Promise<readonly Shelf[]>>(book.shelf.resolve())
expectNotAssignable<Promise<Book>>(book.sequels.resolve())

// The client runtime resolves any reference's data, bound or built by hand.
expectType<Promise<unknown>>(runtime.resolve(reference))
expectType<Promise<unknown>>(runtime.resolve(reference, { signal: new AbortController().signal }))
expectType<Promise<unknown>>(runtime.resolve(book.shelf))

// A reference's resolving operation is named by its cardinality.
expectType<'get' | 'list'>(remote.resolvingOperationKey('one'))
