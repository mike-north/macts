/**
 * Integration tests for loading the configured approval provider.
 *
 * These drive the real resolution path: a registration file written to
 * `<MACTS_HOME>/governance/approval.json` and provider packages written into
 * `<MACTS_HOME>/plugins/node_modules`, the same directory `macts plugin install`
 * populates. Nothing is stubbed — the module is really resolved and imported —
 * so the tests cover the actual contract a provider author must satisfy.
 *
 * The negative cases matter most: a configured-but-broken approval channel must
 * fail loudly at load time, never degrade into "no provider configured" (which
 * would silently look like a machine that never had an approval channel).
 *
 * @see https://github.com/mike-north/macts/issues/107
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ApprovalProviderError,
  getApprovalConfigPath,
  loadApprovalConfig,
  loadApprovalGate,
} from './approval-provider.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PACKAGE_NAME = '@example/macts-approval'

let home: string
let originalMactsHome: string | undefined

/**
 * Write the approval registration file under the temp macts home. A string is
 * written verbatim (for malformed-JSON cases); anything else is serialized.
 */
function writeRegistration(config: unknown): void {
  const dir = join(home, 'governance')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'approval.json'),
    typeof config === 'string' ? config : JSON.stringify(config)
  )
}

/**
 * Write a provider package into the managed plugins directory.
 *
 * @param files - Module filename → source, relative to the package root.
 * @param exportsField - The package's `exports` map. Omit for a plain
 *   `main`-only package.
 */
function writeProviderPackage(
  packageName: string,
  files: Record<string, string>,
  exportsField?: Record<string, string>
): void {
  const dir = join(home, 'plugins', 'node_modules', ...packageName.split('/'))
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: packageName,
      version: '1.0.0',
      type: 'module',
      main: './index.js',
      ...(exportsField === undefined ? {} : { exports: exportsField }),
    })
  )
  for (const [name, source] of Object.entries(files)) {
    writeFileSync(join(dir, name), source)
  }
}

/** Source for a provider module that records the options it was given. */
function providerSource(name: string): string {
  return `
export function createApprovalProvider(options) {
  return {
    name: ${JSON.stringify(name)},
    capabilities: { supportsPolicySuggestions: false, supportsDistinctRouting: false },
    requestApproval() {
      return Promise.resolve({ state: 'approved', evidence: options });
    },
  };
}
`
}

beforeEach(() => {
  originalMactsHome = process.env['MACTS_HOME']
  home = mkdtempSync(join(tmpdir(), 'macts-approval-load-'))
  process.env['MACTS_HOME'] = home
})

afterEach(() => {
  if (originalMactsHome === undefined) {
    delete process.env['MACTS_HOME']
  } else {
    process.env['MACTS_HOME'] = originalMactsHome
  }
  rmSync(home, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

describe('getApprovalConfigPath', () => {
  it('resolves under the macts home governance directory', () => {
    expect(getApprovalConfigPath()).toBe(join(home, 'governance', 'approval.json'))
  })
})

// ---------------------------------------------------------------------------
// No provider configured
// ---------------------------------------------------------------------------

describe('loadApprovalGate with no registration', () => {
  it('returns undefined when no registration file exists', async () => {
    await expect(loadApprovalGate()).resolves.toBeUndefined()
  })

  it('reports no configuration from loadApprovalConfig as well', async () => {
    await expect(loadApprovalConfig()).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Successful load
// ---------------------------------------------------------------------------

describe('loadApprovalGate with a valid registration', () => {
  it('loads the named package from the managed plugins directory', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({ provider: PACKAGE_NAME, timeoutMs: 45_000 })

    const gate = await loadApprovalGate()

    expect(gate).toBeDefined()
    expect(gate?.provider.name).toBe('example-approver')
    expect(gate?.provider.capabilities).toEqual({
      supportsPolicySuggestions: false,
      supportsDistinctRouting: false,
    })
    expect(gate?.timeoutMs).toBe(45_000)
  })

  it('applies the default timeout when the registration omits one', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate()

    expect(gate?.timeoutMs).toBe(120_000)
  })

  it('passes the registration options through to the provider factory verbatim', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({
      provider: PACKAGE_NAME,
      options: { account: 'acct_123', relay: 'wss://example.test' },
    })

    const gate = await loadApprovalGate()
    const decision = await gate?.provider.requestApproval(
      {} as never,
      { signal: new AbortController().signal } as never
    )

    expect(decision?.evidence).toEqual({ account: 'acct_123', relay: 'wss://example.test' })
  })

  it('prefers the dedicated subpath export over the package root', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      {
        'index.js': providerSource('root-entry'),
        'provider.js': providerSource('subpath-entry'),
      },
      { '.': './index.js', './macts-approval-provider': './provider.js' }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate()

    expect(gate?.provider.name).toBe('subpath-entry')
  })
})

// ---------------------------------------------------------------------------
// Failure paths — a configured provider that cannot load is a hard error
// ---------------------------------------------------------------------------

describe('loadApprovalGate failure paths', () => {
  it('throws when the registration file is not valid JSON', async () => {
    writeRegistration('{ not json')

    await expect(loadApprovalGate()).rejects.toBeInstanceOf(ApprovalProviderError)
  })

  it('throws when the registration is missing the provider package name', async () => {
    writeRegistration({ timeoutMs: 1_000 })

    await expect(loadApprovalGate()).rejects.toThrow(/provider/)
  })

  it('throws when the registration sets an out-of-range timeout', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({ provider: PACKAGE_NAME, timeoutMs: 0 })

    await expect(loadApprovalGate()).rejects.toThrow(/timeoutMs/)
  })

  it('throws with install guidance when the named package is not installed', async () => {
    writeRegistration({ provider: '@example/not-installed' })

    await expect(loadApprovalGate()).rejects.toThrow(/macts plugin install @example\/not-installed/)
  })

  it('throws when the package does not export createApprovalProvider', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': 'export const somethingElse = 1;\n' })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate()).rejects.toThrow(/createApprovalProvider/)
  })

  it('throws when the module fails to evaluate', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': 'throw new Error("boom at import");\n' })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate()).rejects.toThrow(/boom at import/)
  })

  it('throws when the factory itself throws', async () => {
    writeProviderPackage(PACKAGE_NAME, {
      'index.js': 'export function createApprovalProvider() { throw new Error("bad options"); }\n',
    })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate()).rejects.toThrow(/bad options/)
  })

  it.each([
    ['a missing requestApproval method', '{ name: "x", capabilities: {} }'],
    ['a missing name', '{ capabilities: {}, requestApproval: () => {} }'],
    [
      'incomplete capability flags',
      '{ name: "x", capabilities: { supportsPolicySuggestions: true }, requestApproval: () => {} }',
    ],
    ['a non-object', '"not a provider"'],
  ])('throws when the factory returns %s', async (_label, returned) => {
    writeProviderPackage(PACKAGE_NAME, {
      'index.js': `export function createApprovalProvider() { return ${returned}; }\n`,
    })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate()).rejects.toThrow(/valid approval provider/)
  })
})
