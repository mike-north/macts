/**
 * Type tests for the two client factories.
 *
 * phases/13 D1 and D2 fix the shape both factories share: an `AppContract`
 * plus locality-specific options yields the app's client, so switching
 * locality changes only the import and the options object. `url` exists only
 * for remote. Both entry points export the same error class bindings, so a
 * value or error from one is the same type in the other.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 *
 * Update inputs of a generated contract accept a value or omission but never
 * `null`: no property is resettable (phases/13 D10), so a reset is not
 * expressible.
 *
 * A generated HTTP client's list returns the contract's `Page` type, so its
 * pages cannot drift from the contract's (phases/13 D2).
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D1, D2)
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type { EventUpdateInput } from '@macts/calendar/contract'
import type { AppContract, ClientBrand, ClientFactory, Page, ResourceTable } from '@macts/contracts'
import type { Note as HttpNote, NotesClient as NotesHttpClient } from '@macts/notes'
import * as remote from './index.js'
import * as local from './local.js'
import type { FixtureClient } from './test-helpers.js'

declare const contract: AppContract<FixtureClient>

// Both factories have the shared ClientFactory shape.
expectAssignable<ClientFactory<remote.RemoteClientOptions>>(remote.createClient)
expectAssignable<ClientFactory<local.LocalClientOptions>>(local.createClient)

// The same contract yields the same client type in both localities, which
// carries the contract's resource table type.
expectType<FixtureClient & ClientBrand<ResourceTable>>(
  remote.createClient(contract, { token: 't', url: 'http://localhost:8372' })
)
expectType<FixtureClient & ClientBrand<ResourceTable>>(local.createClient(contract, { token: 't' }))
expectAssignable<FixtureClient>(local.createClient(contract, { token: 't' }))

// Remote options require the service URL; local options need only the token.
expectAssignable<remote.RemoteClientOptions>({ token: 't', url: new URL('http://localhost:8372') })
expectNotAssignable<remote.RemoteClientOptions>({ token: 't' })
expectAssignable<local.LocalClientOptions>({ token: 't' })
expectNotAssignable<local.LocalClientOptions>({})

// The environment resolver produces remote options.
expectType<remote.RemoteClientOptions>(remote.resolveClientOptions())

// One identity per error class and value type across both entry points.
expectType<typeof remote.TargetNotFoundError>(local.TargetNotFoundError)
expectType<typeof remote.MactsError>(local.MactsError)
declare const integer: remote.Integer
expectType<local.Integer>(integer)
expectNotAssignable<local.Integer>(7)

// Update fields are never nullable while no property is resettable (D10).
expectAssignable<EventUpdateInput>({ summary: 'Standup' })
expectNotAssignable<EventUpdateInput>({ summary: null })

// A generated HTTP client's list returns the shared page type: read-only
// items, and a cursor exactly when more remain.
declare const notesHttp: NotesHttpClient
expectType<Promise<Page<HttpNote>>>(notesHttp.notes.list())
expectNotAssignable<Promise<{ items: HttpNote[]; nextCursor?: string }>>(notesHttp.notes.list())
