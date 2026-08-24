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
 * `<macts-home>/plugins` — and are resolved with the same
 * `createRequire(<plugins>/node_modules)` mechanism the CLI and MCP loaders use,
 * so one `macts plugin install` serves all of them. What differs is
 * *activation*: CLI and MCP plugins are additive and are discovered by scanning,
 * whereas the approval provider is a single authority over whether held calls
 * run, so it is activated only by being named in the registration file.
 *
 * The package is asked for a `createApprovalProvider` factory, tried first at
 * the `macts-approval-provider` subpath (mirroring the `/cli` and `/mcp` subpath
 * convention, for a package that also ships other surfaces) and then at the
 * package root (the common case: a package that exists only to be a provider).
 *
 * ## Failure policy
 *
 * - **No registration file** → no provider. Returns `undefined`; `confirm-first`
 *   calls keep their existing held-pending behavior.
 * - **A registration file that is malformed, names a package that cannot be
 *   resolved, or yields something that is not a provider** → throws
 *   {@link ApprovalProviderError}.
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
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ApprovalConfig, ApprovalProvider } from '@macts/core'
import { parseApprovalConfig, resolveApprovalConfigPath } from '@macts/core'
import { getMactsHome } from '../../paths.js'
import type { ApprovalGateContext } from '../middleware/governance.js'

/**
 * Subpath a provider package may export its factory from, for packages that
 * also ship unrelated surfaces. Mirrors the `/cli` and `/mcp` plugin subpaths.
 */
const PROVIDER_SUBPATH = 'macts-approval-provider'

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
 * Options for {@link loadApprovalConfig} and {@link loadApprovalGate}.
 */
export interface LoadApprovalOptions {
  /**
   * Override the registration file path (tests / custom installs). Defaults to
   * {@link getApprovalConfigPath}.
   */
  readonly path?: string
}

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
 * @param options - Optional registration path override.
 * @returns The gate context, or `undefined` when no provider is configured.
 * @throws {@link ApprovalProviderError} when a provider is configured but cannot
 *   be loaded.
 *
 * @example
 * ```typescript
 * import { createMultiServer } from '@macts/api/server';
 * import { loadActivePolicy, loadApprovalGate } from '@macts/api/server';
 *
 * const policy = await loadActivePolicy();
 * const approvals = await loadApprovalGate();
 * const server = createMultiServer(manifests, {
 *   governance: { policy, ...(approvals ? { approvals } : {}) },
 * });
 * ```
 */
export async function loadApprovalGate(
  options: LoadApprovalOptions = {}
): Promise<ApprovalGateContext | undefined> {
  const path = options.path ?? getApprovalConfigPath()
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

  return { provider, timeoutMs: config.timeoutMs }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Import a provider package and return its `createApprovalProvider` factory.
 */
async function importProviderFactory(
  packageName: string,
  configPath: string
): Promise<ApprovalProviderFactory> {
  const specifier = resolveProviderSpecifier(packageName)
  if (specifier === undefined) {
    throw new ApprovalProviderError(
      configPath,
      `package "${packageName}" could not be resolved. Install it with \`macts plugin install ${packageName}\`.`
    )
  }

  let module: { createApprovalProvider?: unknown }
  try {
    module = (await import(specifier)) as { createApprovalProvider?: unknown }
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
 * Resolve a provider package to an importable specifier.
 *
 * Tries the dedicated subpath first, then the package root, resolving both from
 * the plugins directory when one is present (the installed case) and falling
 * back to ordinary resolution otherwise (development, tests, and workspaces
 * where the provider is a direct dependency).
 *
 * @returns An importable specifier, or `undefined` when nothing resolves.
 */
function resolveProviderSpecifier(packageName: string): string | undefined {
  const root = pluginResolutionRoot()
  const require = createRequire(root === undefined ? import.meta.url : `${root}/.`)

  for (const candidate of [`${packageName}/${PROVIDER_SUBPATH}`, packageName]) {
    try {
      return require.resolve(candidate)
    } catch {
      // Try the next candidate; an unresolvable package is reported by the
      // caller with actionable install guidance.
    }
  }
  return undefined
}

/**
 * The managed plugins `node_modules` directory, when it exists.
 */
function pluginResolutionRoot(): string | undefined {
  const nodeModules = join(getMactsHome(), 'plugins', 'node_modules')
  return existsSync(nodeModules) ? nodeModules : undefined
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
