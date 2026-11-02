/**
 * Which executor a macts host on this Mac runs operations with.
 *
 * The executor is resolved once, when the host starts, and fixed for the
 * life of the runtime it is given to (phases/13 D9). In production that is
 * always the native macOS executor.
 *
 * ## The test executor hook
 *
 * `MACTS_TEST_EXECUTOR` exists only for subprocess user-acceptance tests,
 * which start the real `macts` binary and so cannot hand it an executor the
 * way an in-process test passes one to `createRuntime`. In-process tests never
 * use it. Its restrictions are deliberate and must be kept:
 *
 * - It selects a **built-in** executor **by name** from
 *   {@link TEST_EXECUTOR_NAMES}. It never loads a module, a path, or any other
 *   code named by the environment.
 * - An unknown name fails startup ({@link UnknownTestExecutorError}); it never
 *   falls back to the native executor or to anything else.
 * - When it is active the host announces it with a one-line warning on stderr
 *   ({@link ResolvedExecutor.warning}) and reports the executor's provider in
 *   its startup report. The provider is named in the startup report only;
 *   recording it in audit and approval records is
 *   https://github.com/mike-north/macts/issues/182.
 * - It is a contributor tool: it is documented in contributor docs and here,
 *   never in user docs, READMEs, or `--help`.
 *
 * @packageDocumentation
 */

import {
  createNativeExecutor,
  type ExecutionRequest,
  type Executor,
  type ResolutionRequest,
} from '@macts/core'
import type { WireRecord, WireValue } from '@macts/contracts'

/** The environment variable that selects a built-in test executor. */
export const TEST_EXECUTOR_ENV = 'MACTS_TEST_EXECUTOR'

/** The provider of the built-in `stub` test executor. */
export const TEST_STUB_PROVIDER = 'test-stub'

/**
 * The built-in `stub` test executor: it automates no app and answers every
 * operation and every reference resolution with a deterministic description
 * of the request it received.
 *
 * @remarks
 * An operation's result is `{ executor: 'test-stub', target, input }`: the
 * operation's manifest target and the validated wire input. A resolution's
 * result is `{ executor: 'test-stub', reference }`: the validated reference in
 * wire form. A subprocess test can therefore prove that a call passed every
 * runtime step and was dispatched, and what reached the executor, without any
 * Mac app.
 *
 * @returns An executor whose provider is {@link TEST_STUB_PROVIDER}.
 */
export function createTestStubExecutor(): Executor {
  return {
    provider: TEST_STUB_PROVIDER,
    execute(request: ExecutionRequest): Promise<WireValue> {
      const target: WireRecord =
        request.target.resource === undefined
          ? { command: request.target.command }
          : { command: request.target.command, resource: request.target.resource }
      return Promise.resolve({ executor: TEST_STUB_PROVIDER, target, input: request.input })
    },
    /**
     * Answer a resolution with `{ executor: 'test-stub', reference }`.
     *
     * @remarks
     * The answer describes the request; it is not shaped by
     * `request.outputPlan`. Resolving through the runtime therefore always
     * fails output validation with `UnexpectedValueError`, after the call has
     * passed every earlier step and reached this executor.
     */
    resolve(request: ResolutionRequest): Promise<WireValue> {
      return Promise.resolve({ executor: TEST_STUB_PROVIDER, reference: request.reference })
    },
  }
}

/**
 * The built-in test executors, by the name `MACTS_TEST_EXECUTOR` selects.
 * Adding one is a code change, never configuration.
 */
const TEST_EXECUTORS = {
  stub: createTestStubExecutor,
} as const satisfies Readonly<Record<string, () => Executor>>

/** The name of a built-in test executor. */
export type TestExecutorName = keyof typeof TEST_EXECUTORS

/** Whether `name` is a built-in test executor (an own key, never a prototype member). */
function isTestExecutorName(name: string): name is TestExecutorName {
  return Object.hasOwn(TEST_EXECUTORS, name)
}

/** Every built-in test executor name, sorted. */
export const TEST_EXECUTOR_NAMES: readonly TestExecutorName[] = Object.freeze(
  Object.keys(TEST_EXECUTORS).filter(isTestExecutorName).sort()
)

/**
 * `MACTS_TEST_EXECUTOR` names no built-in test executor, so the host refuses
 * to start.
 */
export class UnknownTestExecutorError extends Error {
  /** Identifies this failure in logs and serialized errors. */
  override readonly name = 'UnknownTestExecutorError'

  /** @param requested - The name `MACTS_TEST_EXECUTOR` was set to. */
  constructor(readonly requested: string) {
    super(
      `${TEST_EXECUTOR_ENV} is set to ${JSON.stringify(requested)}, which is not a built-in test executor. ` +
        `Known names: ${TEST_EXECUTOR_NAMES.join(', ')}. Unset ${TEST_EXECUTOR_ENV} to use the native executor.`
    )
  }
}

/** The executor a host runs with, and what it must announce about it. */
export interface ResolvedExecutor {
  /** The executor to construct the runtime with. */
  readonly executor: Executor
  /**
   * `native` for the native macOS executor; `test` for a built-in test
   * executor, whose provider the host reports at startup.
   */
  readonly kind: 'native' | 'test'
  /**
   * A one-line warning the host writes to stderr at startup. Present only when
   * a test executor is active.
   */
  readonly warning?: string
}

/**
 * Resolve the executor a host on this Mac runs operations with.
 *
 * @remarks
 * With `MACTS_TEST_EXECUTOR` unset, empty, or blank, this is the native macOS
 * executor from `createNativeExecutor()`. Otherwise it is the built-in test
 * executor of that name; see the module documentation for the restrictions on
 * that hook.
 *
 * @param env - The process environment.
 * @returns The executor, and the warning to announce when it is a test executor.
 * @throws {@link UnknownTestExecutorError} when `MACTS_TEST_EXECUTOR` names no
 *   built-in test executor.
 */
export function resolveExecutor(
  env: Readonly<Record<string, string | undefined>>
): ResolvedExecutor {
  const requested = env[TEST_EXECUTOR_ENV]?.trim()
  if (requested === undefined || requested === '') {
    return { executor: createNativeExecutor(), kind: 'native' }
  }
  if (!isTestExecutorName(requested)) {
    throw new UnknownTestExecutorError(requested)
  }
  const executor = TEST_EXECUTORS[requested]()
  return {
    executor,
    kind: 'test',
    warning: `Warning: ${TEST_EXECUTOR_ENV}=${requested} is set: operations run on the built-in test executor (provider "${executor.provider}"), and no app is automated. This is for tests only.`,
  }
}
