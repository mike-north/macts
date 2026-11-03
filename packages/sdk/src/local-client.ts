/**
 * The local client: runs an app's operations on this Mac, in process.
 *
 * Each client owns one Mac-side runtime and dispatches every call through that
 * runtime's invocation pipeline, the same pipeline the macts service runs for
 * a remote call: verify the token, check permission, enforce governance,
 * validate the input, execute. There is no local shortcut; a local call
 * presents its token and is governed exactly as a remote one is (phases/13 D5).
 *
 * Resolving a reference the client decoded goes through the same runtime, as
 * `resolveReference` with the same invocation context an operation call gets,
 * so it is governed as the resource's `get` or `list` operation (phases/13
 * D7).
 *
 * The app is registered with the runtime on the first call, not at
 * construction: the manifest is loaded from the contract, validated, and
 * checked against every descriptor, so a contract whose permissions or targets
 * disagree with its manifest is refused before anything runs.
 *
 * @packageDocumentation
 */

import { AppManifestSchema, createNativeExecutor, type Executor } from '@macts/core'
import {
  InternalError,
  type AppContract,
  type CallOptions,
  type InvocationContext,
} from '@macts/contracts'
import {
  createBearerCredential,
  createRuntime,
  loadHostGovernance,
  type GovernanceContext,
} from '@macts/runtime'
import { createCodecClient, type ClientTransport } from './codec-runtime.js'

/** Options for a client that runs operations on this Mac. */
export interface LocalClientOptions {
  /** The API key (`macts_sk_...`) every call is authorized with. */
  readonly token: string
  /**
   * The governance every call is enforced against. A composition point for
   * tests and alternate deployments.
   *
   * @defaultValue this Mac's governance, from `loadHostGovernance` in
   *   `@macts/runtime`, loaded on the first call
   */
  readonly governance?: GovernanceContext
  /**
   * The executor that carries out authorized operations. A composition point
   * for tests and alternate providers.
   *
   * @defaultValue the native macOS executor from `createNativeExecutor()` in
   *   `@macts/core`
   */
  readonly executor?: Executor
}

/** The outcome of registering the app with the client's runtime. */
type Setup = { readonly ok: true } | { readonly ok: false; readonly cause: unknown }

/**
 * Create a client for one app that runs its operations on this Mac.
 *
 * @remarks
 * The client has the same methods, results, and errors as the remote client
 * from `@macts/sdk`; only the import and the options differ. Each client owns
 * one runtime.
 *
 * On the first call the client loads the app manifest from the contract,
 * validates it, and registers the contract against it. If any of that fails
 * (an invalid manifest, or a descriptor whose permission or target disagrees
 * with the manifest), that call and every later one is rejected with
 * `InternalError`, keeping the original failure as its `cause`. The failure is
 * kept rather than retried because it is deterministic: the same contract and
 * manifest would fail the same way.
 *
 * @example
 * ```typescript
 * import { createClient } from '@macts/sdk/local'
 * import { calendarContract } from '@macts/calendar/contract'
 *
 * const calendar = createClient(calendarContract, { token: process.env.MACTS_API_KEY ?? '' })
 * const calendars = await calendar.calendars.list()
 * ```
 *
 * @param app - The app's generated contract.
 * @param options - The token, and optional governance and executor.
 * @returns The app's client.
 */
export function createClient<Client>(
  app: AppContract<Client>,
  options: LocalClientOptions
): Client {
  const credential = createBearerCredential(options.token)
  const runtime = createRuntime({
    executor: options.executor ?? createNativeExecutor(),
    governance: options.governance ?? loadHostGovernance,
  })

  /** The single registration attempt, kept whether it succeeds or fails. */
  let setup: Promise<Setup> | undefined

  async function register(): Promise<Setup> {
    try {
      const manifest = AppManifestSchema.parse(await app.loadManifest())
      runtime.registerContract(app, manifest)
      return { ok: true }
    } catch (cause) {
      return { ok: false, cause }
    }
  }

  /**
   * Register the app on first use, and reject every call once registration
   * has failed.
   */
  async function ready(): Promise<void> {
    setup ??= register()
    const registered = await setup
    if (!registered.ok) {
      throw new InternalError(
        `The ${app.app} client could not be set up.`,
        {},
        { cause: registered.cause }
      )
    }
  }

  /** The invocation context of one call: the client's credential and the call's signal. */
  function invocationContext(callOptions: CallOptions | undefined): InvocationContext {
    const signal = callOptions?.signal
    return { credential, ...(signal === undefined ? {} : { signal }) }
  }

  const transport: ClientTransport = {
    async invoke(operation, input, callOptions) {
      await ready()
      return runtime.invoke(operation, input, invocationContext(callOptions))
    },
    async resolve(reference, callOptions) {
      await ready()
      return runtime.resolveReference(app.app, reference, invocationContext(callOptions))
    },
  }

  return createCodecClient(app, transport)
}
