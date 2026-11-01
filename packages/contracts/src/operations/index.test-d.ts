/**
 * Type tests for operation descriptors and app contracts.
 *
 * A factory returns exactly the client type the contract binds, and a client
 * runtime infers input and output types from the descriptor it is given.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  AnyOperationDescriptor,
  AppContract,
  CallOptions,
  ClientFactory,
  FileValue,
  ClientRuntime,
  Integer,
  OperationDescriptor,
  OperationId,
  PermissionString,
  ReferenceRegistry,
  ResourceDescriptor,
  ValueType,
} from '../index.js'

interface ListEventsInput {
  readonly calendarId: string
}
interface CalendarEvent {
  readonly title: string
}
interface CalendarClient {
  readonly events: { list(calendarId: string): Promise<readonly CalendarEvent[]> }
}

declare const listEvents: OperationDescriptor<ListEventsInput, readonly CalendarEvent[]>
declare const runtime: ClientRuntime
declare const calendar: AppContract<CalendarClient>
declare const createClient: ClientFactory<{ readonly token: string }>

// The runtime infers input and output from the descriptor.
expectType<Promise<readonly CalendarEvent[]>>(runtime.invoke(listEvents, { calendarId: 'work' }))

// The factory returns the client the contract binds.
expectType<CalendarClient>(createClient(calendar, { token: 'macts_sk_example' }))
expectType<CalendarClient>(calendar.bind(runtime))

// Any concrete descriptor is usable where the input/output types are unknown.
expectAssignable<AnyOperationDescriptor>(listEvents)

// Operation ids and permissions have three segments.
expectAssignable<OperationId>('calendar.events.listEvents')
expectNotAssignable<OperationId>('calendar')
expectAssignable<PermissionString>('calendar:events:list')
expectNotAssignable<PermissionString>('calendar:events')

// Invocation and file fetching accept the same shared call options as
// reference resolution.
expectType<CallOptions>(null as unknown as NonNullable<Parameters<ClientRuntime['invoke']>[2]>)
expectType<CallOptions>(null as unknown as NonNullable<Parameters<FileValue['fetch']>[0]>)

// Resource descriptors carry the identifier value type when the resource has
// an identifier, so an app contract's resources table is its reference
// registry, with no parallel table.
expectType<ValueType<unknown> | undefined>(
  null as unknown as ResourceDescriptor<CalendarEvent>['id']
)

// The identifier type is carried, and a typed descriptor still fits the
// contract's untyped resources table.
declare const eventRecord: ValueType<CalendarEvent>
declare const typedEvents: ResourceDescriptor<CalendarEvent, Integer>
expectType<ValueType<Integer> | undefined>(typedEvents.id)
expectAssignable<ResourceDescriptor<unknown>>(typedEvents)
expectAssignable<AppContract<CalendarClient>['resources']>({ events: typedEvents })
expectAssignable<ReferenceRegistry>({ events: typedEvents })
// Negative: an identifier type does not substitute for a different one.
expectNotAssignable<ResourceDescriptor<CalendarEvent, string>>(typedEvents)
expectAssignable<ReferenceRegistry>(calendar.resources)
expectAssignable<ReferenceRegistry>(null as unknown as AppContract<CalendarClient>['resources'])

// A resource without an identifier is valid; it is referenced only by
// selectors, and the table holding it is still a reference registry.
const paragraphs: ResourceDescriptor<CalendarEvent> = { name: 'paragraphs', record: eventRecord }
expectAssignable<AppContract<CalendarClient>['resources']>({ paragraphs, events: typedEvents })
expectAssignable<ReferenceRegistry>({ paragraphs, events: typedEvents })
expectAssignable<ReferenceRegistry>({ paragraphs: {} })
// Negative: a present identifier must be a value type.
expectNotAssignable<ReferenceRegistry>({ paragraphs: { id: 'paragraph-id' } })
