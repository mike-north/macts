/**
 * The version of the installed `@macts/api` package, read from its own
 * `package.json` so that every report of the server's version (such as
 * `/health`) is the version actually running, never a hand-maintained literal.
 *
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** This package's name, used to recognize its own `package.json`. */
const PACKAGE_NAME = '@macts/api'

/** Reported when the package metadata cannot be found or read. */
const UNKNOWN_VERSION = '0.0.0'

/**
 * How many directories above this module to look for the package root. The
 * module may run from `src/`, from `dist/`, or from a bundled chunk in either,
 * so the root is a small, variable number of levels up.
 */
const MAX_LEVELS = 4

/** The `version` of `@macts/api`'s `package.json` in `dir`, if that file is ours. */
function versionIn(dir: string): string | undefined {
  try {
    const pkg: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    if (
      typeof pkg === 'object' &&
      pkg !== null &&
      'name' in pkg &&
      pkg.name === PACKAGE_NAME &&
      'version' in pkg &&
      typeof pkg.version === 'string'
    ) {
      return pkg.version
    }
  } catch {
    // No readable package.json here; keep looking upward.
  }
  return undefined
}

/**
 * The installed version of `@macts/api`.
 *
 * @returns The `version` field of this package's `package.json`, or `0.0.0`
 *   when it cannot be located.
 */
export function getPackageVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let level = 0; level <= MAX_LEVELS; level++) {
    const version = versionIn(dir)
    if (version !== undefined) return version
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return UNKNOWN_VERSION
}
