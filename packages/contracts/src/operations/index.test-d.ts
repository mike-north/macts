/**
 * Type tests for operation descriptors and app contracts.
 *
 * A factory returns exactly the client type the contract binds, carrying the
 * contract's resource table type, and a client runtime infers input and
 * output types from the descriptor it is given. A contract's resource table
 * type says which reference data its clients can resolve: a key resolves a
 * single reference through `get` and a collection through `list`
 * (phases/13 D7).
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D7)
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type {
  AnyOperationDescriptor,
  AppContract,
  BoundReferenceOf,
  CallOptions,
  ClientBrand,
  ClientFactory,
  IdentityReference,
  FileValue,
  ClientRuntime,
  Integer,
  OperationDescriptor,
  OperationId,
  PermissionString,
  ReferenceRegistry,
  ReferenceScope,
  ResolvableReferenceData,
  ResolvableResourceKey,
  ResourceDescriptor,
  ResourceIdOf,
  ResourceRecordOf,
  ResourceTable,
  SelectorCollectionReference,
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

// The factory returns the client the contract binds, which carries the
// contract's resource table type: the widest one when the contract declares
// none.
expectType<CalendarClient & ClientBrand<ResourceTable>>(
  createClient(calendar, { token: 'macts_sk_example' })
)
expectType<CalendarClient & ClientBrand<ResourceTable>>(calendar.bind(runtime))
expectAssignable<CalendarClient>(calendar.bind(runtime))
// The brand adds no named member to a client.
expectType<never>(null as unknown as Extract<keyof ClientBrand<ResourceTable>, string>)

// Any concrete descriptor is usable where the input/output types are unknown.
expectAssignable<AnyOperationDescriptor>(listEvents)

// Operation ids and permissions have three segments.
expectAssignable<OperationId>('calendar.events.list')
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

// A contract may declare its table's type, which its clients carry. Each
// entry builds on `ResourceDescriptor` and narrows the fields it has to
// required literals, as a generated contract declares it.
declare const calendarRecord: ValueType<CalendarEvent>
declare const eventId: ValueType<Integer>
type CalendarResources = Readonly<{
  events: ResourceDescriptor<CalendarEvent, Integer> & {
    readonly id: ValueType<Integer>
    readonly get: 'calendar.events.get'
    readonly list: 'calendar.events.list'
  }
  calendars: ResourceDescriptor<CalendarEvent> & { readonly get: 'calendar.calendars.get' }
  attendees: ResourceDescriptor<CalendarEvent>
}>
const calendarResources = {
  events: {
    name: 'events',
    record: calendarRecord,
    id: eventId,
    get: 'calendar.events.get',
    list: 'calendar.events.list',
  },
  calendars: { name: 'calendars', record: calendarRecord, get: 'calendar.calendars.get' },
  attendees: { name: 'attendees', record: calendarRecord },
} satisfies CalendarResources
expectAssignable<CalendarResources>(calendarResources)
expectAssignable<ResourceTable>(calendarResources)
declare const typedCalendar: AppContract<CalendarClient, CalendarResources>
expectType<CalendarClient & ClientBrand<CalendarResources>>(
  createClient(typedCalendar, { token: 'macts_sk_example' })
)
// A typed contract is still a contract with no declared table type, and a
// reference scope, even with an entry that records neither an identifier nor
// an operation.
expectAssignable<AppContract<CalendarClient>>(typedCalendar)
expectAssignable<AppContract<unknown>>(typedCalendar)
expectAssignable<ReferenceScope>(typedCalendar)
expectAssignable<ReferenceRegistry>(typedCalendar.resources)
expectAssignable<ReferenceRegistry>(null as unknown as CalendarResources)
// An entry typed only by fields the registry does not declare (here one with
// neither an identifier nor an operation) shares none with it, which is why
// entries build on `ResourceDescriptor`.
expectNotAssignable<ReferenceRegistry>({ attendees: { name: 'attendees', record: calendarRecord } })
// Negative: a table of the wrong shape is not a resource table.
expectNotAssignable<ResourceTable>({ events: { name: 'events' } })

// The resolvable keys of each cardinality, and the record and identifier types.
expectType<'events' | 'calendars'>(
  null as unknown as ResolvableResourceKey<CalendarResources, 'one'>
)
expectType<'events'>(null as unknown as ResolvableResourceKey<CalendarResources, 'many'>)
expectType<CalendarEvent>(null as unknown as ResourceRecordOf<CalendarResources, 'events'>)
expectType<Integer>(null as unknown as ResourceIdOf<CalendarResources, 'events'>)
// A resource without an identifier has none to put in an identity reference.
expectType<never>(null as unknown as ResourceIdOf<CalendarResources, 'calendars'>)
// A table whose keys are not known admits every key, of unknown types.
expectType<string>(null as unknown as ResolvableResourceKey<ResourceTable, 'many'>)
declare const openRecord: ResourceRecordOf<ResourceTable, 'events'>
expectType<unknown>(openRecord)

// Resolvable data names a resolvable key for its cardinality, at every level.
declare const index: Integer
expectAssignable<ResolvableReferenceData<CalendarResources>>({
  app: 'calendar',
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: index,
  container: {
    app: 'calendar',
    resource: 'calendars',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index },
  },
} as const)
expectNotAssignable<ResolvableReferenceData<CalendarResources>>({
  app: 'calendar',
  resource: 'calendars',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
} as const)
expectNotAssignable<ResolvableReferenceData<CalendarResources>>({
  app: 'calendar',
  resource: 'events',
  form: 'selector',
  cardinality: 'many',
  selector: { by: 'every' },
  container: {
    app: 'calendar',
    resource: 'attendees',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index },
  },
} as const)
expectNotAssignable<ResolvableReferenceData<CalendarResources>>({
  app: 'calendar',
  resource: 'events',
  form: 'identity',
  cardinality: 'one',
  id: 'not-an-integer',
} as const)

// The bound variant follows the data's form and cardinality.
expectType<IdentityReference<CalendarEvent, Integer, 'events'>>(
  null as unknown as BoundReferenceOf<
    CalendarResources,
    { app: 'calendar'; resource: 'events'; form: 'identity'; cardinality: 'one'; id: Integer }
  >
)
expectType<SelectorCollectionReference<CalendarEvent, 'events'>>(
  null as unknown as BoundReferenceOf<
    CalendarResources,
    {
      app: 'calendar'
      resource: 'events'
      form: 'selector'
      cardinality: 'many'
      selector: { by: 'every' }
    }
  >
)
