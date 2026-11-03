/**
 * Type tests for the executor seam's request shapes.
 *
 * Plans are required: a caller without derived plans states that explicitly
 * with the passthrough plan rather than omitting them. Input is always a
 * record. A resolution request carries a reference in wire form and the
 * output plan of the operation it resolves as. Every executor resolves
 * references as well as executing operations.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import {
  EMPTY_RESOURCE_PLAN_TABLE,
  PASSTHROUGH_PLAN,
  type ReferenceWire,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { ExecutionRequest, Executor, ResolutionRequest } from './executor.js'

declare const manifest: AppManifest

expectType<WireRecord>(null as unknown as ExecutionRequest['input'])

// Positive: today's dispatch runs through the seam under the passthrough plan.
expectAssignable<ExecutionRequest>({
  manifest,
  target: { command: 'list', resource: 'events' },
  input: { calendar: 'Home' },
  inputPlan: PASSTHROUGH_PLAN,
  outputPlan: PASSTHROUGH_PLAN,
  resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
})

// Negative: plans cannot be omitted.
expectNotAssignable<ExecutionRequest>({
  manifest,
  target: { command: 'list', resource: 'events' },
  input: {},
})

// Negative: input is a record, not an arbitrary wire value.
expectNotAssignable<ExecutionRequest>({
  manifest,
  target: { command: 'list', resource: 'events' },
  input: ['Home'],
  inputPlan: PASSTHROUGH_PLAN,
  outputPlan: PASSTHROUGH_PLAN,
  resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
})

// A resolution request carries the reference in wire form.
expectType<ReferenceWire>(null as unknown as ResolutionRequest['reference'])

// Positive: a validated reference and the output plan it resolves to.
expectAssignable<ResolutionRequest>({
  manifest,
  reference: {
    resource: 'Event',
    form: 'selector',
    cardinality: 'many',
    selector: { by: 'range', start: { integer: '0' }, end: { integer: '10' } },
  },
  outputPlan: PASSTHROUGH_PLAN,
  resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
})

// Negative: the output plan cannot be omitted.
expectNotAssignable<ResolutionRequest>({
  manifest,
  reference: {
    resource: 'Event',
    form: 'selector',
    cardinality: 'many',
    selector: { by: 'every' },
  },
})

// Negative: the reference is the wire form, not SDK data (a selector index is
// an integer control record on the wire, not a number).
expectNotAssignable<ResolutionRequest>({
  manifest,
  reference: {
    resource: 'Event',
    form: 'selector',
    cardinality: 'one',
    selector: { by: 'index', index: 0 },
  },
  outputPlan: PASSTHROUGH_PLAN,
  resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
})

declare function execute(request: ExecutionRequest): Promise<WireValue>
declare function resolve(request: ResolutionRequest): Promise<WireValue>

// Positive: an executor executes operations and resolves references.
expectAssignable<Executor>({ provider: 'example', execute, resolve })

// Negative: resolution is required; an executor cannot omit it.
expectNotAssignable<Executor>({ provider: 'example', execute })
