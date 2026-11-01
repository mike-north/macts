/**
 * Type tests for value plans.
 *
 * The native codec walks a plan by switching on `kind`, so each kind must
 * narrow to exactly its own members. Presence and nullability are separate
 * axes, and the passthrough plan is a distinct kind rather than an alias of
 * `unknown`.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import {
  PASSTHROUGH_PLAN,
  type FieldPlan,
  type FieldPresence,
  type ValuePlan,
  type ValuePlanKind,
} from '../index.js'

declare const plan: ValuePlan

// Kind narrows to the members that kind carries.
switch (plan.kind) {
  case 'enum':
    expectType<readonly string[]>(plan.members)
    break
  case 'array':
    expectType<ValuePlan>(plan.items)
    break
  case 'record':
    expectType<Readonly<Record<string, FieldPlan>>>(plan.fields)
    break
  case 'nullable':
    expectType<ValuePlan>(plan.value)
    break
  case 'reference':
    expectType<string>(plan.resource)
    expectType<'one' | 'many'>(plan.cardinality)
    break
  default:
    expectType<Exclude<ValuePlanKind, 'enum' | 'array' | 'record' | 'nullable' | 'reference'>>(
      plan.kind
    )
    break
}

// Negative: kinds do not carry other kinds' members.
expectNotAssignable<ValuePlan>({ kind: 'integer', members: ['a'] })
expectNotAssignable<ValuePlan>({ kind: 'array' })
expectNotAssignable<ValuePlan>({ kind: 'reference', resource: 'events', cardinality: 'some' })
expectNotAssignable<ValuePlan>({ kind: 'json' })

// Presence narrows independently of the field's value shape.
declare const field: FieldPlan
if (field.presence === 'optional') {
  expectType<'optional'>(field.presence)
} else {
  expectType<'required'>(field.presence)
}
expectType<FieldPresence>(field.presence)

// Edge: presence and nullability are separate axes. A required field may be
// nullable, and nullability is never spelled as a presence.
expectAssignable<FieldPlan>({
  presence: 'required',
  value: { kind: 'nullable', value: { kind: 'date' } },
})
expectAssignable<FieldPlan>({
  presence: 'optional',
  value: { kind: 'nullable', value: { kind: 'integer' } },
})
expectNotAssignable<FieldPlan>({ presence: 'nullable', value: { kind: 'date' } })

// Edge: plans nest through arrays and records.
expectAssignable<ValuePlan>({
  kind: 'array',
  items: {
    kind: 'record',
    fields: {
      start: { presence: 'required', value: { kind: 'date' } },
      attendees: {
        presence: 'optional',
        value: { kind: 'reference', resource: 'attendees', cardinality: 'many' },
      },
    },
  },
})

// The passthrough plan is its own kind and is a complete plan.
expectType<'passthrough'>(PASSTHROUGH_PLAN.kind)
expectAssignable<ValuePlan>(PASSTHROUGH_PLAN)
expectNotAssignable<{ readonly kind: 'unknown' }>(PASSTHROUGH_PLAN)
