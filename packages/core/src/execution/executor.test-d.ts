/**
 * Type tests for the executor seam's request shape.
 *
 * Plans are required: a caller without derived plans states that explicitly
 * with the passthrough plan rather than omitting them. Input is always a
 * record.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { PASSTHROUGH_PLAN, type WireRecord } from '@macts/contracts'
import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { ExecutionRequest } from './executor.js'

declare const manifest: AppManifest

expectType<WireRecord>(null as unknown as ExecutionRequest['input'])

// Positive: today's dispatch runs through the seam under the passthrough plan.
expectAssignable<ExecutionRequest>({
  manifest,
  target: { command: 'list', resource: 'events' },
  input: { calendar: 'Home' },
  inputPlan: PASSTHROUGH_PLAN,
  outputPlan: PASSTHROUGH_PLAN,
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
})
