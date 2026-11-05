/**
 * Packed-install UAT for `@macts/sdk`.
 *
 * Installs the packed SDK, its macts dependencies, the real `@macts/notes`
 * app package, and a hand-written app package into a fresh project, then
 * drives it as a user's program would. Expected outcomes are hand-written from
 * phases/13 D1:
 *
 * - the install graph contains no native addon, and the `@macts/*` packages
 *   installed are exactly the SDK's dependency closure (contracts, core,
 *   runtime) plus the SDK and the app packages, so installing `@macts/sdk`
 *   alone brings no native addon;
 * - the app package's optional peers (`@macts/cli`, `clipanion`, `typanion`)
 *   stay uninstalled;
 * - exactly one copy of `@macts/contracts` is installed, which is what error
 *   identity and integer brands rely on;
 * - an error thrown through the real Notes contract's remote client is
 *   `instanceof` `TargetNotFoundError` and `MactsError` from `@macts/sdk` and
 *   from `@macts/sdk/local`;
 * - an error thrown through the app's remote client is `instanceof` the class
 *   imported from `@macts/sdk` and from `@macts/sdk/local`, and of
 *   `MactsError` from both;
 * - an `Integer` from `@macts/sdk` is accepted where `@macts/sdk/local`'s is
 *   required;
 * - with the Mac-side runtime and core removed, `@macts/sdk` still loads and
 *   runs the remote client, and `@macts/sdk/local` fails to load.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D1)
 */

import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  findInstalledCopies,
  findNativeAddons,
  installConsumer,
  installContractsConsumer,
  installedMactsPackages,
  isInstalled,
  packAll,
  runConsumer,
  typecheckBrandCheck,
} from '../src/harness.js'

/** Packing and installing reaches the npm registry for third-party dependencies. */
const SETUP_TIMEOUT_MS = 240_000

let root: string
let consumer: string
let contractsConsumer: string

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'macts-packed-install-'))
  consumer = join(root, 'consumer')
  const tarballs = await packAll(root)
  await installConsumer(consumer, tarballs)
  contractsConsumer = join(root, 'contracts-consumer')
  await installContractsConsumer(contractsConsumer, tarballs.contracts)
}, SETUP_TIMEOUT_MS)

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('packed install: installed tree', () => {
  it('contains no native addon', () => {
    expect(findNativeAddons(consumer)).toEqual([])
  })

  it("contains exactly the SDK's dependency closure plus the app packages", () => {
    // Together with the absence of native addons above, this is the check that
    // installing `@macts/sdk` alone brings no native addon: the SDK's closure
    // is contracts, core, and runtime, and nothing else from macts is present.
    expect(installedMactsPackages(consumer)).toEqual([
      '@macts/contracts',
      '@macts/core',
      '@macts/notes',
      '@macts/runtime',
      '@macts/sdk',
    ])
  })

  it('leaves the app package optional peers uninstalled', () => {
    for (const peer of ['@macts/cli', 'clipanion', 'typanion']) {
      expect(isInstalled(consumer, peer), peer).toBe(false)
    }
  })

  it('contains exactly one copy of @macts/contracts', () => {
    expect(findInstalledCopies(consumer, '@macts/contracts')).toEqual([
      join('node_modules', '@macts', 'contracts'),
    ])
  })
})

describe('packed install: identity across entry points', () => {
  it('reconstructs a remote error as the class both entry points export', async () => {
    const report = await runConsumer(consumer, 'full-install.mjs')

    expect(report).toMatchObject({
      error: {
        name: 'TargetNotFoundError',
        code: 'TARGET_NOT_FOUND',
        message: 'No such widget.',
        details: { resource: 'Widget' },
      },
      instanceOf: {
        sdkTargetNotFound: true,
        localTargetNotFound: true,
        sdkMactsError: true,
        localMactsError: true,
      },
      sameBindings: {
        errorClass: true,
        errorClassFromContracts: true,
        integerLimits: true,
        sharedFactory: true,
        sharedBinder: true,
      },
      localFactory: 'function',
    })
  })

  it('reconstructs a remote error from the real Notes contract as the shared classes', async () => {
    const report = await runConsumer(consumer, 'notes-install.mjs')

    expect(report).toEqual({
      app: 'notes',
      error: {
        name: 'TargetNotFoundError',
        code: 'TARGET_NOT_FOUND',
        message: 'No such attachment.',
        details: { resource: 'Attachment' },
      },
      instanceOf: {
        sdkTargetNotFound: true,
        localTargetNotFound: true,
        sdkMactsError: true,
        localMactsError: true,
      },
    })
  })

  it('decodes an integer through the app contract and accepts it against the local entry', async () => {
    const report = await runConsumer(consumer, 'full-install.mjs')

    expect(report).toMatchObject({
      listed: { items: [{ name: 'Sprocket', count: 7 }] },
      integerAcceptedByLocal: true,
      authorizations: [
        'Bearer macts_sk_packed-install-token',
        'Bearer macts_sk_packed-install-token',
      ],
    })
  })

  it('type-checks an Integer from @macts/sdk where @macts/sdk/local requires one', async () => {
    expect((await typecheckBrandCheck(consumer)).trim()).toBe('')
  })
})

describe('packed install: remote only', () => {
  it('loads and runs @macts/sdk without the Mac-side runtime, and refuses @macts/sdk/local', async () => {
    const remoteOnly = join(root, 'remote-only')
    cpSync(consumer, remoteOnly, { recursive: true })
    rmSync(join(remoteOnly, 'node_modules', '@macts', 'runtime'), { recursive: true })
    rmSync(join(remoteOnly, 'node_modules', '@macts', 'core'), { recursive: true })

    const report = await runConsumer(remoteOnly, 'remote-only.mjs')

    expect(report).toMatchObject({
      listed: { items: [{ name: 'Sprocket', count: 7 }] },
      errorIsTargetNotFound: true,
      local: { loaded: false, code: 'ERR_MODULE_NOT_FOUND' },
    })
  })
})

/** A generated facade may depend on the shared client without the SDK closure. */
describe('packed install: shared client alone', () => {
  it('loads shared composition with contracts and Zod only', async () => {
    expect(installedMactsPackages(contractsConsumer)).toEqual(['@macts/contracts'])
    expect(findNativeAddons(contractsConsumer)).toEqual([])
    expect(await runConsumer(contractsConsumer, 'shared-only.mjs')).toEqual({
      codec: 'function',
      remote: 'function',
      binder: 'function',
    })
  })
})
