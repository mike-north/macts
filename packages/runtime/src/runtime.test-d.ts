/**
 * Type tests for the runtime's public construction and invocation surface.
 *
 * They complement the runtime tests in runtime.test.ts by pinning what the
 * compiler accepts: a runtime cannot be built without an executor, every
 * invocation requires a credential-bearing context, and results are wire
 * values.
 *
 * Invalid usage is expressed with `expectNotAssignable` rather than
 * `expectError`, because `src/**` is also compiled by `tsc --noEmit`.
 */

import { expectAssignable, expectNotAssignable, expectType } from 'tsd'
import type { Executor } from '@macts/core'
import type { Credential, InvocationContext, WireValue } from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import type { GovernanceContext } from './governance/context.js'
import { loadHostGovernance } from './governance/host.js'
import { createBearerCredential } from './invocation/credential.js'
import type { CreateRuntimeOptions, MactsRuntime } from './runtime.js'
import { createRuntime } from './runtime.js'

declare const executor: Executor
declare const runtime: MactsRuntime

// The credential holder is exposed only through the contract type.
expectType<Credential>(createBearerCredential('macts_sk_x'))

// An executor is required; everything else is optional.
expectAssignable<CreateRuntimeOptions>({ executor })
expectNotAssignable<CreateRuntimeOptions>({})
expectNotAssignable<CreateRuntimeOptions>({ clock: () => new Date(0) })
expectType<MactsRuntime>(createRuntime({ executor, clock: () => new Date(0) }))

// Governance is a context or a loader of one; this Mac's loader is passed as-is.
expectAssignable<CreateRuntimeOptions>({ executor, governance: { policy: ALLOW_ALL_POLICY } })
expectAssignable<CreateRuntimeOptions>({ executor, governance: loadHostGovernance })
expectType<Promise<GovernanceContext>>(loadHostGovernance())
expectNotAssignable<CreateRuntimeOptions>({
  executor,
  governance: () => ({ policy: ALLOW_ALL_POLICY }),
})

// Invocation requires a context carrying a credential, and resolves to a wire value.
const context: InvocationContext = { credential: createBearerCredential('macts_sk_x') }
expectType<Promise<WireValue>>(runtime.invoke('calendar.events.list', {}, context))
expectNotAssignable<InvocationContext>({})
expectNotAssignable<InvocationContext>({ signal: new AbortController().signal })

// Operation ids have the app.resource.command shape.
type InvokedId = Parameters<MactsRuntime['invoke']>[0]
expectAssignable<InvokedId>('calendar.events.list')
expectNotAssignable<InvokedId>('list')
