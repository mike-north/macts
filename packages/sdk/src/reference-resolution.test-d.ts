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
 * `bindReference(client, data)` binds a caller-built reference, or one bound
 * to another client, to a client. Both entry points export the same function.
 * It takes the data form of any reference and returns a bound reference of
 * either cardinality, whose `resolve()` yields a record or an array of
 * records.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D7)
 */

import { expectNotAssignable, expectType } from 'tsd'
import type {
  ClientRuntime,
  CollectionReferenceVariant,
  IdentityReference,
  ObjectReferenceVariant,
  ReferenceData,
} from '@macts/contracts'
import type { Book, LibraryClient, Shelf } from './library-fixture.js'
import * as remote from './index.js'
import * as local from './local.js'

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

// Both entry points export the same binder.
expectType<typeof remote.bindReference>(local.bindReference)

// Binding takes any reference's data, bound or built by hand, and returns a bound reference.
expectType<ObjectReferenceVariant<unknown> | CollectionReferenceVariant<unknown>>(
  remote.bindReference(client, reference)
)
expectType<ObjectReferenceVariant<unknown> | CollectionReferenceVariant<unknown>>(
  local.bindReference(client, book.shelf)
)
expectType<Promise<unknown>>(remote.bindReference(client, reference).resolve())

// A client is an object; a primitive is not, and is not reference data either.
expectNotAssignable<Parameters<typeof remote.bindReference>[0]>('library')
expectNotAssignable<Parameters<typeof remote.bindReference>[1]>({ app: 'library' })
