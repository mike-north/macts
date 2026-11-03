/**
 * Regression: a call whose input holds a reference was blamed on the caller.
 *
 * Contacts' rollover actions (`performAction`, `actionTitle`,
 * `shouldEnableAction`) take a person reference. The input is valid against the
 * operation's wire contract, but the macOS provider's value codec has no
 * conversion for references. It reported that as a failed input conversion, so
 * the call failed with `ValidationError`. It must fail with `InternalError`,
 * because no input could succeed there, and before the app is addressed.
 *
 * The call runs through the local client with the real generated Contacts
 * contract and the real native executor; only the executor's transport is
 * replaced, so the input plan is the one the contract carries.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D4, D9, D11)
 */

import { createContext, runInContext } from 'node:vm'
import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  NATIVE_CODEC,
  NATIVE_CODEC_ERROR_NAME,
  NATIVE_DECODE_FUNCTION,
  createNativeExecutor,
  runNativeScript,
  type NativeOutcome,
  type NativeScript,
  type NativeTransport,
} from '@macts/core'
import {
  InternalError,
  toWireErrorEnvelope,
  type ObjectReferenceData,
  type OperationId,
} from '@macts/contracts'
import { contactsContract } from '@macts/contacts/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-reference-input-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

setLogger(createLogger({ level: 'silent' }))

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/** A bundle identifier no app has: addressing it fails as an app failure. */
const NOT_INSTALLED_BUNDLE_ID = 'com.example.macts.not-installed'

/** A person reference, as a caller builds one. */
const PERSON: ObjectReferenceData<string, 'Person'> = {
  app: 'contacts',
  resource: 'Person',
  form: 'identity',
  cardinality: 'one',
  id: 'p-1',
}

/** The actions whose required `for` is a person. */
const ACTIONS = [
  { method: 'performAction', id: 'contacts.app.performAction' },
  { method: 'actionTitle', id: 'contacts.app.actionTitle' },
  { method: 'shouldEnableAction', id: 'contacts.app.shouldEnableAction' },
] as const

/**
 * Decodes a script's input with the shipped codec prelude in an isolated
 * context, as the script's first statement does, and reports the outcome the
 * script would print. It never addresses an app.
 */
function decodeOnly(script: NativeScript): NativeOutcome {
  const context = createContext({})
  runInContext(NATIVE_CODEC.prelude, context)
  const decode = runInContext(NATIVE_DECODE_FUNCTION, context) as (
    wire: unknown,
    plan: unknown
  ) => unknown
  try {
    decode(script.input, script.inputPlan)
  } catch (error) {
    const thrown = error as Record<string, unknown>
    if (thrown['name'] !== NATIVE_CODEC_ERROR_NAME) throw error
    return {
      ok: false,
      failure: {
        source: 'codec',
        direction: thrown['direction'] as 'decode',
        path: thrown['path'] as string[],
        message: thrown['message'] as string,
        ...(typeof thrown['unsupportedKind'] === 'string'
          ? { unsupportedKind: thrown['unsupportedKind'] }
          : {}),
      },
    }
  }
  return { ok: true, value: 'decoded' }
}

/** A Contacts client whose executor runs scripts through `transport`. */
async function contactsClient(id: OperationId, transport: NativeTransport) {
  const permission = contactsContract.operations[id]?.permission
  if (permission === undefined) throw new Error(`no ${id} operation`)
  const key = await createApiKey({ name: 'Reference input test', permissions: [permission] })
  return createClient(contactsContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({ transport }),
  })
}

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

describe('a Contacts action given a person reference (regression)', () => {
  it.each(ACTIONS)(
    '$method fails with InternalError, not ValidationError, and the script decodes first',
    async ({ method, id }) => {
      const scripts: NativeScript[] = []
      const client = await contactsClient(id, {
        run(script) {
          scripts.push(script)
          return Promise.resolve(decodeOnly(script))
        },
      })

      const error = await rejectionOf(client[method]('value', PERSON))

      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).toBe(
        `The Contacts operation "${method}" takes reference values at \`for\`, which the macOS provider does not support yet.`
      )
      expect(error.details).toEqual({})
      // A remote caller receives this message verbatim and nothing else: no
      // value, and not the codec's own text, which stays in the local cause.
      expect(toWireErrorEnvelope(error)).toEqual({
        error: { code: 'INTERNAL', message: error.message, details: {} },
      })
      // The executor ran the plan the generated contract carries.
      expect(scripts).toHaveLength(1)
      expect(scripts[0]?.inputPlan).toEqual(contactsContract.operations[id]?.input.plan)
    }
  )

  it.skipIf(process.platform !== 'darwin')(
    'fails in the real automation process before the app is addressed',
    async () => {
      // The script targets an app that does not exist: had decoding not failed
      // first, constructing the app would have failed as an app failure.
      const client = await contactsClient('contacts.app.performAction', {
        run: (script, options) =>
          runNativeScript({ ...script, bundleId: NOT_INSTALLED_BUNDLE_ID }, NATIVE_CODEC, {
            timeout: options.timeoutMs,
          }),
      })

      const error = await rejectionOf(client.performAction('value', PERSON))

      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).toContain('reference values at `for`')
    },
    30_000
  )
})
