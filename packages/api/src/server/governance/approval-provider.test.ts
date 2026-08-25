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
import type { AuditWriter } from '@macts/core'
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

/**
 * A minimal audit sink. Every successful load has to be handed one — an
 * approval gate may not exist without somewhere to record its decisions.
 */
const WRITER: AuditWriter = { append: () => Promise.resolve() }

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
  exportsField?: unknown
): void {
  writePackageAt(join(home, 'plugins', 'node_modules'), packageName, files, exportsField)
}

/**
 * Write a package into an arbitrary `node_modules` root.
 *
 * Used to plant a package *outside* the managed plugins directory and prove it
 * cannot become the approval authority.
 */
function writePackageAt(
  nodeModules: string,
  packageName: string,
  files: Record<string, string>,
  exportsField?: unknown,
  manifestOverrides: Record<string, unknown> = {}
): void {
  const dir = join(nodeModules, ...packageName.split('/'))
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: packageName,
      version: '1.0.0',
      type: 'module',
      main: './index.js',
      ...(exportsField === undefined ? {} : { exports: exportsField }),
      ...manifestOverrides,
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
    await expect(loadApprovalGate({ writer: WRITER })).resolves.toBeUndefined()
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

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate).toBeDefined()
    expect(gate?.approvals.provider.name).toBe('example-approver')
    expect(gate?.approvals.provider.capabilities).toEqual({
      supportsPolicySuggestions: false,
      supportsDistinctRouting: false,
    })
    expect(gate?.approvals.timeoutMs).toBe(45_000)
  })

  it('applies the default timeout when the registration omits one', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.timeoutMs).toBe(120_000)
  })

  it('passes the registration options through to the provider factory verbatim', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({
      provider: PACKAGE_NAME,
      options: { account: 'acct_123', relay: 'wss://example.test' },
    })

    const gate = await loadApprovalGate({ writer: WRITER })
    const decision = await gate?.approvals.provider.requestApproval(
      {} as never,
      { signal: new AbortController().signal } as never
    )

    expect(decision?.evidence).toEqual({ account: 'acct_123', relay: 'wss://example.test' })
  })

  // The subpath is a concise sibling of the established `<package>/cli` and
  // `<package>/mcp` entry points, so a multi-surface plugin package does not
  // have to publish a one-off host-prefixed name.
  it('prefers the "/approval" subpath export over the package root', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      {
        'index.js': providerSource('root-entry'),
        'provider.js': providerSource('subpath-entry'),
      },
      { '.': './index.js', './approval': './provider.js' }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('subpath-entry')
  })

  it('carries the audit writer alongside the gate', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    // The pair travels together, so a caller cannot assemble a governance
    // context that seeks approval and records nothing.
    expect(gate?.writer).toBe(WRITER)
  })
})

// ---------------------------------------------------------------------------
// Export-map shapes
//
// A provider is imported as ESM, so resolution must match the `import`
// condition. Matching `require` instead makes a pure-ESM package — which is
// what macts's own packages and any modern provider publish — throw
// ERR_PACKAGE_PATH_NOT_EXPORTED and get misreported as uninstalled.
// ---------------------------------------------------------------------------

describe('loadApprovalGate export-map resolution', () => {
  it('loads a package whose subpath is exported only under "import"', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      { 'provider.js': providerSource('import-only-subpath') },
      { './approval': { import: './provider.js' } }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('import-only-subpath')
  })

  it('loads a package whose root is exported only under "import"', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      { 'index.js': providerSource('import-only-root') },
      { '.': { import: './index.js' } }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('import-only-root')
  })

  it('loads a package using a bare conditions object as root sugar', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      { 'index.js': providerSource('conditions-sugar') },
      { import: './index.js' }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('conditions-sugar')
  })

  it('loads a package whose exports field is a plain string', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      { 'index.js': providerSource('string-exports') },
      './index.js'
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('string-exports')
  })

  it('honors a dual export map by taking the "import" branch', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      {
        'index.mjs': providerSource('esm-branch'),
        // Deliberately not valid ESM: picking this branch would fail the import.
        'index.cjs': 'module.exports.createApprovalProvider = () => { throw new Error("cjs") }',
      },
      { '.': { require: './index.cjs', import: './index.mjs' } }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('esm-branch')
  })

  it('follows an array of conditional fallbacks', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      { 'index.js': providerSource('array-fallback') },
      { '.': [{ types: './index.d.ts' }, { import: './index.js' }] }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('array-fallback')
  })

  it('falls back to "main" for a package with no exports map', async () => {
    // A bare `main`, without the leading "./" that packages often omit.
    writePackageAt(
      join(home, 'plugins', 'node_modules'),
      PACKAGE_NAME,
      { 'entry.js': providerSource('main-field') },
      undefined,
      { main: 'entry.js' }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('main-field')
  })

  it('reports an installed package with no usable entry as such, not as uninstalled', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      { 'other.js': providerSource('unreachable') },
      { './something-else': './other.js' }
    )
    writeRegistration({ provider: PACKAGE_NAME })

    // "not installed" would send an operator to reinstall a package that is
    // already there; the real problem is its export map.
    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(
      /installed but exposes no importable entry point/
    )
  })
})

// ---------------------------------------------------------------------------
// Resolution boundary
// ---------------------------------------------------------------------------

describe('loadApprovalGate resolution boundary', () => {
  it('refuses a package installed outside the managed plugins directory', async () => {
    // A sibling node_modules that CommonJS resolution would happily walk up
    // into. Only the managed directory may supply the approval authority, so a
    // package here must not be found at all.
    writePackageAt(join(home, 'node_modules'), PACKAGE_NAME, {
      'index.js': providerSource('outside-the-boundary'),
    })
    mkdirSync(join(home, 'plugins', 'node_modules'), { recursive: true })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/is not installed under/)
  })

  it('prefers the managed copy when the same package exists in a parent', async () => {
    writePackageAt(join(home, 'node_modules'), PACKAGE_NAME, {
      'index.js': providerSource('outside-the-boundary'),
    })
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('managed-copy') })
    writeRegistration({ provider: PACKAGE_NAME })

    const gate = await loadApprovalGate({ writer: WRITER })

    expect(gate?.approvals.provider.name).toBe('managed-copy')
  })

  it.each([
    ['a parent-directory traversal', '../../../evil'],
    ['an absolute path', '/etc/passwd'],
    ['a nested path', '@example/a/b'],
    ['a bare dot-dot', '..'],
  ])('rejects %s as a provider package name', async (_label, provider) => {
    writeRegistration({ provider })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/is not installed under/)
  })

  it('refuses an exports target that escapes the package directory', async () => {
    writeProviderPackage(
      PACKAGE_NAME,
      { 'index.js': providerSource('escapes') },
      { '.': './../../../../outside.js' }
    )
    writeFileSync(join(home, 'outside.js'), providerSource('outside'))
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(
      /installed but exposes no importable entry point/
    )
  })
})

// ---------------------------------------------------------------------------
// Failure paths — a configured provider that cannot load is a hard error
// ---------------------------------------------------------------------------

describe('loadApprovalGate failure paths', () => {
  // The type system already rejects a missing writer; this covers a JavaScript
  // caller, for whom discovering it at the first approved call would be exactly
  // the unaudited execution the requirement exists to prevent.
  it.each([
    ['omitted', undefined],
    ['null', null],
    ['not a writer', {}],
    ['a writer whose append is not callable', { append: 'nope' }],
  ])('throws when the audit writer is %s', async (_label, writer) => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate({ writer: writer as unknown as AuditWriter })).rejects.toThrow(
      /requires an audit writer/
    )
  })

  it('refuses a writer-less gate before it even reads the registration', async () => {
    // No registration file at all: the writer check must still fire, so a
    // misconfigured caller is told about it rather than silently getting
    // `undefined` and believing no provider was configured.
    await expect(loadApprovalGate({ writer: undefined as unknown as AuditWriter })).rejects.toThrow(
      /requires an audit writer/
    )
  })

  it('throws when the registration file is not valid JSON', async () => {
    writeRegistration('{ not json')

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toBeInstanceOf(ApprovalProviderError)
  })

  it('throws when the registration is missing the provider package name', async () => {
    writeRegistration({ timeoutMs: 1_000 })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/provider/)
  })

  it('throws when the registration sets an out-of-range timeout', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': providerSource('example-approver') })
    writeRegistration({ provider: PACKAGE_NAME, timeoutMs: 0 })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/timeoutMs/)
  })

  it('throws with install guidance when the named package is not installed', async () => {
    writeRegistration({ provider: '@example/not-installed' })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(
      /macts plugin install @example\/not-installed/
    )
  })

  it('throws when the package does not export createApprovalProvider', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': 'export const somethingElse = 1;\n' })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/createApprovalProvider/)
  })

  it('throws when the module fails to evaluate', async () => {
    writeProviderPackage(PACKAGE_NAME, { 'index.js': 'throw new Error("boom at import");\n' })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/boom at import/)
  })

  it('throws when the factory itself throws', async () => {
    writeProviderPackage(PACKAGE_NAME, {
      'index.js': 'export function createApprovalProvider() { throw new Error("bad options"); }\n',
    })
    writeRegistration({ provider: PACKAGE_NAME })

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/bad options/)
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

    await expect(loadApprovalGate({ writer: WRITER })).rejects.toThrow(/valid approval provider/)
  })
})
