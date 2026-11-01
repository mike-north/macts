/**
 * Resolving a subpath export of an installed macts package to a file.
 *
 * The `@macts/<app>` packages are ESM-only and declare only the `"types"` and
 * `"import"` conditions, so Node's CJS `require.resolve` (which matches only
 * `"require"`) can never resolve their subpaths. This module reads the
 * package's `exports` map directly instead, applying the constraints Node
 * itself puts on an export target, so a malformed or malicious target cannot
 * point outside the package that declares it. The CLI plugin loader (an app
 * package's `./cli`) and the host registration path (a host package's `.`)
 * both resolve through it.
 *
 * @see https://nodejs.org/api/packages.html#subpath-exports
 * @see https://nodejs.org/api/esm.html#resolution-algorithm-specification
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Narrow an unknown value to an indexable object.
 *
 * Every shape read from an installed package — a dynamically imported module,
 * a parsed package.json, an exports map — arrives as `unknown` and has to be
 * narrowed by a guard rather than asserted with a cast. A cast here would be a
 * claim about untrusted input, which is exactly what we cannot make.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Result of resolving a package's subpath export to an importable file URL.
 *
 * `not-installed` means the package itself is absent; `load-error` means it is
 * present but its package.json or the export is unusable.
 */
export type PackageExportResolution =
  | { found: true; url: string }
  | { found: false; reason: 'not-installed' | 'load-error'; error: string }

/**
 * Resolve a subpath export of an installed package to an absolute `file:` URL.
 *
 * @param packageDir - Absolute path of the installed package's directory.
 * @param packageName - The package's name, for messages (e.g. `@macts/notes`).
 * @param subpath - The export to resolve: `.` or a subpath beginning with `./`
 *   (e.g. `./cli`).
 * @returns The file URL, or why the export cannot be used.
 */
export function resolvePackageExport(
  packageDir: string,
  packageName: string,
  subpath: string
): PackageExportResolution {
  const packageJsonPath = join(packageDir, 'package.json')
  let pkg: unknown
  try {
    pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      found: false,
      reason: 'load-error',
      error: `Failed to read package.json for ${packageName}: ${message}`,
    }
  }

  const entry = resolveExportsSubpath(isRecord(pkg) ? pkg['exports'] : undefined, subpath)
  if (!entry) {
    return {
      found: false,
      reason: 'load-error',
      error: `Package ${packageName} does not define a '${subpath}' export (or none of its conditions include "import" or "default")`,
    }
  }

  const validatedTarget = validateExportsTarget(packageName, packageDir, subpath, entry)
  if (!validatedTarget.ok) {
    return { found: false, reason: 'load-error', error: validatedTarget.error }
  }

  const resolvedPath = validatedTarget.path
  if (!existsSync(resolvedPath)) {
    return {
      found: false,
      reason: 'load-error',
      error: `Package ${packageName}'s '${subpath}' export points to a missing file: ${entry}`,
    }
  }

  return { found: true, url: pathToFileURL(resolvedPath).href }
}

/**
 * Whether a parsed package.json declares `subpath` in its `exports` map under
 * a condition this module resolves (`"import"` or `"default"`).
 */
export function declaresExport(pkg: unknown, subpath: string): boolean {
  return resolveExportsSubpath(isRecord(pkg) ? pkg['exports'] : undefined, subpath) !== null
}

/**
 * Result of validating an `exports` map target string.
 */
type ExportsTargetValidation = { ok: true; path: string } | { ok: false; error: string }

/**
 * Validate an `exports` map target string against Node's own constraints on
 * package-target values, then resolve it to an absolute path within
 * `packageDir`.
 *
 * Reading the `exports` map by hand means we bypass Node's built-in resolver
 * entirely — including the validation Node would otherwise perform on the
 * target string before ever touching the filesystem. A malicious or malformed
 * target (a bare specifier, an absolute path, or a `../` escape) must be
 * rejected here for the same reason Node itself rejects it: an `exports`
 * target is only ever supposed to point somewhere inside the package that
 * declares it.
 *
 * @see https://nodejs.org/api/packages.html#exports-sugar
 * @see https://nodejs.org/api/esm.html#resolution-algorithm-specification
 */
function validateExportsTarget(
  packageName: string,
  packageDir: string,
  subpath: string,
  target: string
): ExportsTargetValidation {
  const invalid = (detail: string): ExportsTargetValidation => ({
    ok: false,
    error: `Package ${packageName}'s '${subpath}' export target ${JSON.stringify(target)} is invalid: ${detail}`,
  })

  // Node's PACKAGE_TARGET_RESOLVE requires a target to be a string starting
  // with "./"; anything else (a bare specifier, an absolute path like
  // "/abs/path.js", or a "../" escape) is ERR_INVALID_PACKAGE_TARGET.
  if (!target.startsWith('./')) {
    return invalid('exports targets must be relative paths beginning with "./"')
  }

  // Beyond the leading "./", Node also rejects any "." or ".." segment (which
  // would otherwise let a target escape the package directory) and any
  // "node_modules" segment.
  const segments = target.split('/').slice(1)
  const hasForbiddenSegment = segments.some(
    (segment) =>
      segment === '' ||
      segment === '.' ||
      segment === '..' ||
      segment.toLowerCase() === 'node_modules'
  )
  if (hasForbiddenSegment) {
    return invalid('exports targets must not contain "..", ".", or "node_modules" path segments')
  }

  // Defense in depth: confirm the normalized, resolved path is still inside
  // packageDir. Comparing against packageDir plus a trailing separator
  // ensures a sibling directory with a shared prefix (e.g. "packageDir-evil")
  // can't pass this check.
  const resolvedPath = resolve(packageDir, target)
  const packageDirWithSep = packageDir.endsWith(sep) ? packageDir : `${packageDir}${sep}`
  if (resolvedPath !== packageDir && !resolvedPath.startsWith(packageDirWithSep)) {
    return invalid('resolves outside the package directory')
  }

  return { ok: true, path: resolvedPath }
}

/**
 * Resolve a subpath in a package's `exports` map to a relative file path,
 * preferring the `"import"` condition (these packages are ESM-only) and
 * falling back to `"default"` when present. Handles both the string and
 * conditions-object forms of an exports entry.
 */
function resolveExportsSubpath(exportsField: unknown, subpath: string): string | null {
  if (!isRecord(exportsField)) return null
  const entry = exportsField[subpath]
  return resolveExportsConditions(entry)
}

/**
 * Resolve an individual exports entry value (as found at a subpath key) to a
 * relative file path string.
 */
function resolveExportsConditions(entry: unknown): string | null {
  if (typeof entry === 'string') return entry

  if (isRecord(entry)) {
    const candidate = entry['import'] ?? entry['default']
    if (typeof candidate === 'string') return candidate
    // Conditions may themselves nest further conditions (e.g. `"import": { "default": ... }`).
    return resolveExportsConditions(candidate)
  }

  return null
}
