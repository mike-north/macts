/**
 * Loading the configured human-in-the-loop approval provider for the API server.
 *
 * The governance evaluator can hold a call pending human confirmation. This
 * module resolves *who gets asked*: it reads the approval-provider registration
 * (`<macts-home>/governance/approval.json`), resolves the named package from the
 * shared plugins directory, and hands back a ready
 * {@link ApprovalGateContext} for the enforcement middleware.
 *
 * ## Resolution
 *
 * Providers are installed like every other macts plugin — into
 * `<macts-home>/plugins`, by the same `macts plugin install` — but they are
 * *activated* differently: CLI and MCP plugins are additive and are discovered
 * by scanning, whereas the approval provider is a single authority over whether
 * held calls run, so it is activated only by being named in the registration
 * file.
 *
 * That difference extends to how the module is located. The plugins directory
 * is a **boundary**: only something installed there may act as the approval
 * authority. Node's CommonJS resolver cannot express that — it walks up every
 * ancestor `node_modules`, and it matches the `require` condition, which makes
 * a pure-ESM provider look uninstalled. So resolution here is done by path
 * under the managed root, honouring the package's own `exports` map with ESM
 * conditions. See {@link resolveProviderModule}.
 *
 * The package is asked for a `createApprovalProvider` factory, tried first at
 * the `approval` subpath — a concise sibling of the established `<package>/cli`
 * and `<package>/mcp` entry points, for a package that also ships other
 * surfaces — and then at the package root (the common case: a package that
 * exists only to be a provider).
 *
 * ## Failure policy
 *
 * - **No registration file** → no provider. Returns `undefined`; `confirm-first`
 *   calls keep their existing held-pending behavior.
 * - **A registration file that is malformed, names a package that cannot be
 *   resolved, or yields something that is not a provider** → throws
 *   {@link ApprovalProviderError}.
 * - **No audit writer supplied** → throws {@link ApprovalProviderError}. An
 *   approval gate may not exist without a durable audit sink, because a
 *   `confirm-first` operation must never execute without its decision being
 *   persisted. The returned value carries the writer so a caller cannot
 *   assemble a governance context that seeks approval and records nothing.
 *
 * A configured-but-broken approval channel is a hard startup error, never a
 * silent downgrade. Degrading to "no provider" would look identical to a machine
 * that was never configured, so an operator whose provider stopped resolving
 * would keep believing their `confirm-first` rules reach a human. The same
 * reasoning governs a malformed policy file.
 *
 * @packageDocumentation
 */

import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ApprovalConfig, ApprovalProvider, AuditWriter } from '@macts/core'
import { parseApprovalConfig, resolveApprovalConfigPath } from '@macts/core'
import { getMactsHome } from '../../paths.js'
import type { GovernanceContextWithApprovals } from '../middleware/governance.js'

/**
 * Subpath a provider package may export its factory from, for packages that
 * also ship unrelated surfaces. A concise sibling of the `/cli` and `/mcp`
 * plugin subpaths, so the convention is inferable rather than one-off.
 */
const PROVIDER_SUBPATH = 'approval'

/**
 * Accepted npm package names: `name` or `@scope/name`.
 *
 * The name arrives from a configuration file and becomes a filesystem path, so
 * it is matched against this rather than trusted — `..`, absolute paths, and
 * extra segments are all rejected before any path is built.
 */
const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i

/**
 * The factory a provider package must export.
 *
 * It receives the registration's opaque `options` block verbatim and returns a
 * provider (or a promise of one, for a channel that needs async setup such as
 * opening a connection or unlocking a key).
 */
export type ApprovalProviderFactory = (
  options: Readonly<Record<string, unknown>>
) => ApprovalProvider | Promise<ApprovalProvider>

/**
 * Error thrown when an approval provider is configured but cannot be loaded:
 * a malformed registration file, an unresolvable package, a missing factory
 * export, or a factory that returns something that is not a provider.
 */
export class ApprovalProviderError extends Error {
  constructor(
    /** The registration file the configuration was read from. */
    public readonly path: string,
    message: string
  ) {
    super(`Invalid approval provider configuration at "${path}": ${message}`)
    this.name = 'ApprovalProviderError'
  }
}

/**
 * Resolve the absolute path to the approval-provider registration file.
 *
 * Delegates to the canonical resolver in `@macts/core` so every surface reads
 * the same file.
 *
 * @returns Absolute path to `<macts-home>/governance/approval.json`.
 */
export function getApprovalConfigPath(): string {
  return resolveApprovalConfigPath(getMactsHome())
}

/**
 * Options for {@link loadApprovalConfig}.
 */
export interface LoadApprovalOptions {
  /**
   * Override the registration file path (tests / custom installs). Defaults to
   * {@link getApprovalConfigPath}.
   */
  readonly path?: string
}

/**
 * Options for {@link loadApprovalGate}.
 */
export interface LoadApprovalGateOptions extends LoadApprovalOptions {
  /**
   * Audit sink for governance decisions. **Required**: an approval gate may not
   * exist without somewhere to record the decisions it obtains.
   */
  readonly writer: AuditWriter
}

/**
 * The governance-context fragment a loaded approval gate produces.
 *
 * Carries the writer alongside the gate so the two travel together — a caller
 * spreads this into their governance context and cannot end up seeking approval
 * with no audit sink.
 */
export type LoadedApprovalGate = Pick<GovernanceContextWithApprovals, 'writer' | 'approvals'>

/**
 * Read and validate the approval-provider registration.
 *
 * @param options - Optional path override.
 * @returns The parsed registration, or `undefined` when no registration file
 *   exists (no approval provider configured).
 * @throws {@link ApprovalProviderError} when the file exists but is malformed.
 */
export async function loadApprovalConfig(
  options: LoadApprovalOptions = {}
): Promise<ApprovalConfig | undefined> {
  const path = options.path ?? getApprovalConfigPath()

  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    // ENOENT → no approval provider configured. Re-throw anything else
    // (permission denied, etc.) so genuine I/O faults are not mistaken for
    // "nothing configured".
    if (isNodeNotFoundError(error)) {
      return undefined
    }
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ApprovalProviderError(path, `not valid JSON: ${message}`)
  }

  const result = parseApprovalConfig(parsed)
  if (!result.success) {
    const summary = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')
    throw new ApprovalProviderError(path, summary)
  }
  return result.data
}

/**
 * Load the configured approval provider and build the gate context the
 * enforcement middleware consumes.
 *
 * @param options - The audit writer (required) and an optional registration
 *   path override.
 * @returns The `{ writer, approvals }` fragment to spread into a governance
 *   context, or `undefined` when no provider is configured.
 * @throws {@link ApprovalProviderError} when a provider is configured but cannot
 *   be loaded, or when no usable audit writer was supplied.
 *
 * @example
 * ```typescript
 * import { createMultiServer } from '@macts/api/server';
 * import { loadActivePolicy, loadApprovalGate } from '@macts/api/server';
 * import { createFileAuditWriter } from '@macts/core';
 *
 * const policy = await loadActivePolicy();
 * const writer = createFileAuditWriter('/path/to/audit.jsonl');
 * const approvals = await loadApprovalGate({ writer });
 * const server = createMultiServer(manifests, {
 *   governance: approvals ? { policy, ...approvals } : { policy, writer },
 * });
 * ```
 */
export async function loadApprovalGate(
  options: LoadApprovalGateOptions
): Promise<LoadedApprovalGate | undefined> {
  const path = options.path ?? getApprovalConfigPath()

  // Checked before anything else, and at runtime as well as in the type system:
  // a JavaScript caller can still omit it, and discovering that only when the
  // first held call is approved would be exactly the failure this guards.
  if (!isAuditWriter(options.writer)) {
    throw new ApprovalProviderError(
      path,
      'an approval gate requires an audit writer (an object with an `append` method), ' +
        'so that no approved call can execute without its decision being recorded'
    )
  }

  const config = await loadApprovalConfig({ path })
  if (config === undefined) {
    return undefined
  }

  const factory = await importProviderFactory(config.provider, path)

  let provider: ApprovalProvider
  try {
    provider = await factory(config.options)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ApprovalProviderError(
      path,
      `package "${config.provider}" failed to create a provider: ${message}`
    )
  }

  if (!isApprovalProvider(provider)) {
    throw new ApprovalProviderError(
      path,
      `package "${config.provider}" did not return a valid approval provider ` +
        '(expected { name, capabilities: { supportsPolicySuggestions, supportsDistinctRouting }, requestApproval })'
    )
  }

  return {
    writer: options.writer,
    approvals: { provider, timeoutMs: config.timeoutMs },
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a value can serve as an {@link AuditWriter}.
 *
 * A structural check, not a `instanceof`: callers legitimately supply their own
 * sinks (in-memory, SIEM export) rather than only `createFileAuditWriter`.
 */
function isAuditWriter(value: unknown): value is AuditWriter {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { append?: unknown }).append === 'function'
  )
}

/**
 * Import a provider package and return its `createApprovalProvider` factory.
 */
async function importProviderFactory(
  packageName: string,
  configPath: string
): Promise<ApprovalProviderFactory> {
  const resolution = resolveProviderModule(packageName)

  if (resolution.kind === 'not-installed') {
    throw new ApprovalProviderError(
      configPath,
      `package "${packageName}" is not installed under ${pluginNodeModules()}. Install it with \`macts plugin install ${packageName}\`.`
    )
  }
  if (resolution.kind === 'no-entry') {
    // The package is present, so "not installed" would send an operator down
    // the wrong path. Say what is actually wrong with it.
    throw new ApprovalProviderError(
      configPath,
      `package "${packageName}" is installed but exposes no importable entry point: ${resolution.detail}`
    )
  }

  let module: { createApprovalProvider?: unknown }
  try {
    module = (await import(resolution.url)) as { createApprovalProvider?: unknown }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ApprovalProviderError(
      configPath,
      `package "${packageName}" could not be loaded: ${message}`
    )
  }

  if (typeof module.createApprovalProvider !== 'function') {
    throw new ApprovalProviderError(
      configPath,
      `package "${packageName}" does not export a "createApprovalProvider" function`
    )
  }
  return module.createApprovalProvider as ApprovalProviderFactory
}

/**
 * The outcome of locating a provider package's entry module.
 */
type ProviderResolution =
  | { readonly kind: 'ok'; readonly url: string }
  | { readonly kind: 'not-installed' }
  | { readonly kind: 'no-entry'; readonly detail: string }

/**
 * Locate a provider package's entry module inside the managed plugins tree.
 *
 * ## Why this does not use `require.resolve`
 *
 * The obvious implementation — `createRequire(<plugins>/node_modules).resolve()`
 * — is wrong twice over:
 *
 * 1. **It resolves with the `require` condition.** A provider published as pure
 *    ESM (an `exports` map with only an `"import"` condition, which is what
 *    macts's own packages and any modern provider ship) throws
 *    `ERR_PACKAGE_PATH_NOT_EXPORTED`, and a correctly-installed provider gets
 *    reported as missing.
 * 2. **It walks up the directory chain.** CommonJS resolution tries every
 *    ancestor's `node_modules`, so a package that is *not* in the managed
 *    directory can still resolve — from the operator's home directory, or from
 *    the API server's own dependencies. The plugins root is meant to be the
 *    boundary for what may act as the approval authority, and a resolver that
 *    escapes it makes that boundary decorative.
 *
 * Node offers no supported way to run its ESM resolver against an arbitrary
 * base: `import.meta.resolve`'s `parent` argument requires
 * `--experimental-import-meta-resolve` and is otherwise **silently ignored**,
 * which would resolve against this file and reintroduce (2) invisibly.
 *
 * So resolution is done by path, strictly under the managed root, honouring the
 * package's own `exports` map with ESM conditions.
 *
 * @returns Where the entry module is, or why there isn't one.
 */
function resolveProviderModule(packageName: string): ProviderResolution {
  const nodeModules = pluginNodeModules()
  const packageDir = resolvePackageDir(packageName, nodeModules)
  if (packageDir === undefined) {
    return { kind: 'not-installed' }
  }

  const manifestPath = join(packageDir, 'package.json')
  if (!existsSync(manifestPath)) {
    return { kind: 'not-installed' }
  }

  let manifest: PackageManifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { kind: 'no-entry', detail: `its package.json could not be read (${message})` }
  }

  // The dedicated subpath first, then the package root.
  for (const subpath of [`./${PROVIDER_SUBPATH}`, '.']) {
    const target = resolveExportTarget(manifest, subpath)
    if (target === undefined) {
      continue
    }
    const file = resolveInsidePackage(packageDir, target)
    if (file !== undefined && existsSync(file)) {
      return { kind: 'ok', url: pathToFileURL(file).href }
    }
  }

  return {
    kind: 'no-entry',
    detail: `neither "${packageName}/${PROVIDER_SUBPATH}" nor its package root resolves to a file (check its "exports" map or "main")`,
  }
}

/**
 * The managed plugins `node_modules` directory. The single root every provider
 * is resolved under, whether or not it currently exists.
 */
function pluginNodeModules(): string {
  return join(getMactsHome(), 'plugins', 'node_modules')
}

/**
 * Map an npm package name to its directory under the managed root.
 *
 * The name comes from a configuration file, so it is validated rather than
 * pasted into a path: an unscoped name is one segment, a scoped name is two,
 * and nothing else is accepted. The resolved directory is then re-checked to be
 * inside the root, so neither a crafted name nor a symlink can point the
 * approval authority somewhere else.
 *
 * @returns The package directory, or `undefined` when the name is invalid or
 *   nothing is installed there.
 */
function resolvePackageDir(packageName: string, nodeModules: string): string | undefined {
  if (!PACKAGE_NAME_PATTERN.test(packageName)) {
    return undefined
  }

  const candidate = resolve(nodeModules, ...packageName.split('/'))
  if (!existsSync(candidate)) {
    return undefined
  }

  // Compare real paths so a symlinked package directory (how pnpm installs) is
  // judged by where it actually is, not by the link's location.
  const rootReal = safeRealpath(nodeModules)
  const candidateReal = safeRealpath(candidate)
  if (rootReal === undefined || candidateReal === undefined) {
    return undefined
  }
  return isInside(rootReal, candidateReal) ? candidateReal : undefined
}

/**
 * Resolve a package-relative `exports` target to an absolute path, refusing
 * anything that escapes the package directory.
 */
function resolveInsidePackage(packageDir: string, target: string): string | undefined {
  if (!target.startsWith('./')) {
    return undefined
  }
  const file = resolve(packageDir, target)
  return isInside(packageDir, file) ? file : undefined
}

/**
 * True when `child` is `parent` itself or sits beneath it.
 */
function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * `realpathSync` that reports failure as `undefined` rather than throwing.
 */
function safeRealpath(path: string): string | undefined {
  try {
    return realpathSync(path)
  } catch {
    return undefined
  }
}

/**
 * The fields of a package manifest this module reads.
 */
interface PackageManifest {
  readonly exports?: unknown
  readonly main?: unknown
}

/**
 * Conditions honoured when walking an `exports` map, in addition to any subpath
 * keys.
 *
 * This module always imports as ESM from Node, so `require` is deliberately
 * absent — matching it is what made a pure-ESM provider look uninstalled.
 */
const SUPPORTED_CONDITIONS = new Set(['node', 'import', 'default'])

/**
 * Resolve one subpath (`'.'` or `'./approval'`) against a package manifest.
 *
 * Covers the shapes real packages publish: a string `exports`, a subpath map, a
 * bare conditions object (sugar for `.`), nested conditions, and array
 * fallbacks — plus `main`/`index.js` for a package with no `exports` at all.
 * Wildcard subpath patterns (`"./*"`) are not matched; a package that exposes
 * its provider only through one can still be named at its root.
 *
 * @returns A package-relative target such as `'./dist/index.js'`, or
 *   `undefined` when this subpath is not exported.
 */
function resolveExportTarget(manifest: PackageManifest, subpath: string): string | undefined {
  const { exports: exportsField } = manifest

  if (exportsField === undefined || exportsField === null) {
    // No exports map: only the package root is importable, via `main` (or the
    // implicit index).
    if (subpath !== '.') {
      return undefined
    }
    return typeof manifest.main === 'string' && manifest.main.length > 0
      ? normalizeRelative(manifest.main)
      : './index.js'
  }

  if (typeof exportsField === 'string') {
    return subpath === '.' ? normalizeRelative(exportsField) : undefined
  }

  if (Array.isArray(exportsField)) {
    return subpath === '.' ? resolveConditionValue(exportsField) : undefined
  }

  if (typeof exportsField !== 'object') {
    return undefined
  }

  const map = exportsField as Record<string, unknown>
  const hasSubpathKeys = Object.keys(map).some((key) => key.startsWith('.'))

  if (!hasSubpathKeys) {
    // A bare conditions object is sugar for the package root.
    return subpath === '.' ? resolveConditionValue(map) : undefined
  }

  return Object.hasOwn(map, subpath) ? resolveConditionValue(map[subpath]) : undefined
}

/**
 * Resolve an `exports` value — a string, a conditions object, or an array of
 * fallbacks — to a package-relative target.
 *
 * Conditions are matched in the order the package declares them, which is what
 * the resolution algorithm specifies; `null` (an explicitly blocked target) and
 * unsupported conditions are skipped.
 */
function resolveConditionValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return normalizeRelative(value)
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = resolveConditionValue(entry)
      if (resolved !== undefined) {
        return resolved
      }
    }
    return undefined
  }

  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  for (const [condition, target] of Object.entries(value as Record<string, unknown>)) {
    if (!SUPPORTED_CONDITIONS.has(condition)) {
      continue
    }
    const resolved = resolveConditionValue(target)
    if (resolved !== undefined) {
      return resolved
    }
  }
  return undefined
}

/**
 * Normalize a manifest path (`main` may omit the leading `./`) to the
 * package-relative form the rest of this module expects.
 */
function normalizeRelative(target: string): string {
  if (target.startsWith('./')) {
    return target
  }
  return target.startsWith('/') ? `.${target}` : `./${target}`
}

/**
 * Validate that a value satisfies the approval provider interface.
 *
 * A provider is third-party code loaded by name, so its shape is checked rather
 * than trusted — a partially-implemented provider must fail at startup, not at
 * the first held call.
 */
function isApprovalProvider(value: unknown): value is ApprovalProvider {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as {
    name?: unknown
    capabilities?: unknown
    requestApproval?: unknown
  }
  if (typeof candidate.name !== 'string' || candidate.name.length === 0) {
    return false
  }
  if (typeof candidate.requestApproval !== 'function') {
    return false
  }
  if (typeof candidate.capabilities !== 'object' || candidate.capabilities === null) {
    return false
  }
  const capabilities = candidate.capabilities as {
    supportsPolicySuggestions?: unknown
    supportsDistinctRouting?: unknown
  }
  return (
    typeof capabilities.supportsPolicySuggestions === 'boolean' &&
    typeof capabilities.supportsDistinctRouting === 'boolean'
  )
}

/**
 * Narrow an unknown thrown value to a Node `ENOENT` (file-not-found) error.
 */
function isNodeNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}
