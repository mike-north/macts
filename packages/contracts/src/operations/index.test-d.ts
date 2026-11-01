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
  OperationDescriptor,
  OperationId,
  PermissionString,
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
