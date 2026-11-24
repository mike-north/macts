/**
 * A hand-written stand-in app, "Roster", for tests of scalar command results
 * and of person-reference inputs through the SDK clients.
 *
 * No real app command takes a single reference as a required input and
 * returns plain text or a boolean, so the tests that need those kinds run
 * against this app. It stands in for a generated contract, and its operation
 * ids and permissions follow the manifest route rules
 * (`app.<resource plural>.<command key>`, permission
 * `app:<resource plural>:<command key>`, with `app` for application commands):
 *
 * - `roster.app.currentLabel`: text result, no input.
 * - `roster.app.labelFor`: text result; takes a value `with` and a required
 *   person reference `for`.
 * - `roster.app.confirm`, `roster.app.isAllowed`: boolean results; same inputs.
 * - `roster.people.get`: one person by identifier, so a person reference can
 *   be resolved (the app finds a person by identifier in `people`).
 *
 * Every result is nullable, as a command whose dictionary type does not
 * establish that each invocation yields a value is.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7)
 */

import type { AppManifest } from '@macts/core'
import {
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type ObjectReferenceData,
  type OperationDescriptor,
  type ResourceDescriptor,
  type ValueType,
} from '@macts/contracts'

/** The permission every Roster operation needs, by operation id. */
export const ROSTER_PERMISSIONS = {
  currentLabel: 'roster:app:currentLabel',
  labelFor: 'roster:app:labelFor',
  confirm: 'roster:app:confirm',
  isAllowed: 'roster:app:isAllowed',
  getPerson: 'roster:people:get',
} as const

/** A person as SDK callers see it. */
export interface RosterPerson {
  readonly id: string
  readonly name: string
}

/** A reference to one Roster person. */
export type RosterPersonReference = ObjectReferenceData<string, 'Person'>

/** The input of the commands that act for a person. */
interface ForPerson {
  readonly with: unknown
  readonly for: RosterPersonReference
}

/** The Roster app's manifest: one resource with a `get`, and four application commands. */
export const ROSTER_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Roster', bundleId: 'com.example.roster', tccEntitlements: [] },
  resources: {
    Person: {
      name: 'Person',
      plural: 'People',
      description: 'A person on the roster',
      properties: {
        name: {
          access: 'r',
          type: 'string',
          description: 'The name of the person',
          optional: false,
        },
      },
      identifiers: [{ property: 'id', primary: true, targeting: 'byId' }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    getPerson: {
      name: 'get',
      routeName: 'get',
      description: 'Get one person',
      scope: 'resource',
      resourceType: 'Person',
      parameters: [{ name: 'id', type: 'string', description: 'Identifier', required: true }],
    },
    currentLabel: {
      name: 'currentLabel',
      description: 'The label of the current view',
      scope: 'application',
      returns: 'string',
      parameters: [],
    },
    labelFor: {
      name: 'labelFor',
      description: 'The label shown for a person and a value',
      scope: 'application',
      returns: 'string',
      parameters: [
        { name: 'with', type: 'any', description: 'The value', required: true },
        {
          name: 'for',
          type: { resource: 'Person' },
          description: 'The person',
          required: true,
        },
      ],
    },
    confirm: {
      name: 'confirm',
      description: 'Confirm a value for a person',
      scope: 'application',
      returns: 'boolean',
      parameters: [
        { name: 'with', type: 'any', description: 'The value', required: true },
        {
          name: 'for',
          type: { resource: 'Person' },
          description: 'The person',
          required: true,
        },
      ],
    },
    isAllowed: {
      name: 'isAllowed',
      description: 'Whether a value is allowed for a person',
      scope: 'application',
      returns: 'boolean',
      parameters: [
        { name: 'with', type: 'any', description: 'The value', required: true },
        {
          name: 'for',
          type: { resource: 'Person' },
          description: 'The person',
          required: true,
        },
      ],
    },
  },
}

/** The Roster contract, read lazily by the person reference value type. */
const scope = (): AppContract<RosterClient, RosterResources> => rosterContract

const PERSON_RECORD: ValueType<RosterPerson> = t.record({ id: t.string(), name: t.string() })

/** The input of a command that acts for a person: a value and a person reference. */
const forPersonInput = () =>
  t.record({
    with: t.unknown({ description: 'The value' }),
    for: t.reference<RosterPerson, string, 'Person'>(scope, 'Person', 'one', {
      description: 'The person',
    }),
  })

const currentLabelOperation: OperationDescriptor<Readonly<Record<string, never>>, string | null> = {
  id: 'roster.app.currentLabel',
  permission: ROSTER_PERMISSIONS.currentLabel,
  target: { command: 'currentLabel' },
  description: 'The label of the current view',
  input: t.record({}),
  output: t.nullable(t.string()),
}

const labelForOperation: OperationDescriptor<ForPerson, string | null> = {
  id: 'roster.app.labelFor',
  permission: ROSTER_PERMISSIONS.labelFor,
  target: { command: 'labelFor' },
  description: 'The label shown for a person and a value',
  input: forPersonInput(),
  output: t.nullable(t.string()),
}

const confirmOperation: OperationDescriptor<ForPerson, boolean | null> = {
  id: 'roster.app.confirm',
  permission: ROSTER_PERMISSIONS.confirm,
  target: { command: 'confirm' },
  description: 'Confirm a value for a person',
  input: forPersonInput(),
  output: t.nullable(t.boolean()),
}

const isAllowedOperation: OperationDescriptor<ForPerson, boolean | null> = {
  id: 'roster.app.isAllowed',
  permission: ROSTER_PERMISSIONS.isAllowed,
  target: { command: 'isAllowed' },
  description: 'Whether a value is allowed for a person',
  input: forPersonInput(),
  output: t.nullable(t.boolean()),
}

const getPersonOperation: OperationDescriptor<{ readonly id: string }, RosterPerson> = {
  id: 'roster.people.get',
  permission: ROSTER_PERMISSIONS.getPerson,
  target: { command: 'getPerson', resource: 'Person' },
  description: 'Get one person',
  input: t.record({ id: t.string() }),
  output: PERSON_RECORD,
}

/** Every Roster operation, as a generator would emit them. */
const OPERATIONS: readonly AnyOperationDescriptor[] = [
  currentLabelOperation,
  labelForOperation,
  confirmOperation,
  isAllowedOperation,
  getPersonOperation,
]

/** The Roster app's client, with the call options every generated client method takes. */
export interface RosterClient extends ClientBrand<RosterResources> {
  currentLabel(options?: CallOptions): Promise<string | null>
  labelFor(
    withValue: unknown,
    forPerson: RosterPersonReference,
    options?: CallOptions
  ): Promise<string | null>
  confirm(
    withValue: unknown,
    forPerson: RosterPersonReference,
    options?: CallOptions
  ): Promise<boolean | null>
  isAllowed(
    withValue: unknown,
    forPerson: RosterPersonReference,
    options?: CallOptions
  ): Promise<boolean | null>
}

/** The Roster resource table: `Person` is found by `roster.people.get`. */
export type RosterResources = Readonly<{
  Person: ResourceDescriptor<RosterPerson, string> & {
    readonly id: ValueType<string>
    readonly get: 'roster.people.get'
  }
}>

/** A hand-built contract for {@link ROSTER_MANIFEST}, standing in for a generated one. */
export const rosterContract: AppContract<RosterClient, RosterResources> = {
  app: 'roster',
  operations: Object.fromEntries(OPERATIONS.map((operation) => [operation.id, operation])),
  resources: {
    Person: { name: 'Person', record: PERSON_RECORD, id: t.string(), get: 'roster.people.get' },
  },
  loadManifest: () => Promise.resolve(ROSTER_MANIFEST),
  bind(runtime: ClientRuntime): RosterClient {
    return {
      currentLabel: (options) => runtime.invoke(currentLabelOperation, {}, options),
      labelFor: (withValue, forPerson, options) =>
        runtime.invoke(labelForOperation, { with: withValue, for: forPerson }, options),
      confirm: (withValue, forPerson, options) =>
        runtime.invoke(confirmOperation, { with: withValue, for: forPerson }, options),
      isAllowed: (withValue, forPerson, options) =>
        runtime.invoke(isAllowedOperation, { with: withValue, for: forPerson }, options),
    } as RosterClient
  },
}
