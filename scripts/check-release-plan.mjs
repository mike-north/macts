/**
 * Guard against accidentally cutting a 1.0 release.
 *
 * macts is pre-1.0 on purpose. Changesets can arrive at a major bump without
 * anyone writing a `major` changeset: its peer-dependency rule majors any
 * package that peer-depends on something receiving a non-patch bump, and
 * `fixed: [["@macts/*"]]` then propagates that single major across every
 * package in the workspace.
 *
 * This script computes the pending release plan and fails if any package would
 * land at >= 1.0.0. It runs in CI so the problem surfaces on the pull request
 * that introduces it, rather than in a "Version Packages" PR nobody expected.
 *
 * It reads the plan through `@changesets/get-release-plan`, which assembles
 * from the changeset files, the workspace manifests, and any pre-release state
 * on disk. Deliberately not the `changeset status` CLI: that resolves changed
 * packages against the base branch via git, which fails on CI's shallow
 * checkout where `main` has no local ref.
 *
 * To cut a real 1.0 deliberately, add a `major` changeset AND set
 * `ALLOW_MAJOR_RELEASE=1` in the environment.
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import getReleasePlanModule from '@changesets/get-release-plan'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (process.env['ALLOW_MAJOR_RELEASE'] === '1') {
  console.log('ALLOW_MAJOR_RELEASE=1 — skipping the pre-1.0 release-plan guard.')
  process.exit(0)
}

// The package is CJS with a `default` export; interop shape varies by loader.
const getReleasePlan = getReleasePlanModule?.default ?? getReleasePlanModule

let releases
try {
  const plan = await getReleasePlan(repoRoot)
  releases = Array.isArray(plan?.releases) ? plan.releases : []
} catch (error) {
  console.error('Could not compute the changesets release plan.')
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
}

if (releases.length === 0) {
  console.log('No pending releases — nothing to check.')
  process.exit(0)
}

// A leading major of 0 is the only thing this guard cares about. Comparing the
// parsed major directly (rather than a semver range) keeps prereleases honest:
// 1.0.0-next.0 is still a 1.0.
const offenders = releases.filter((release) => {
  const major = Number.parseInt(String(release.newVersion).split('.')[0] ?? '', 10)
  return Number.isFinite(major) && major >= 1
})

if (offenders.length > 0) {
  console.error(
    `Release plan would publish ${offenders.length} package(s) at 1.0 or above:\n` +
      offenders
        .slice(0, 10)
        .map((r) => `  ${r.name}: ${r.oldVersion} -> ${r.newVersion} (${r.type})`)
        .join('\n') +
      (offenders.length > 10 ? `\n  ...and ${offenders.length - 10} more` : '') +
      '\n\nmacts is intentionally pre-1.0. A major bump usually means either a stray\n' +
      "`major` changeset, or a peerDependencies edge tripping Changesets' peer\n" +
      'major-bump rule (see RELEASING.md, "Staying pre-1.0").\n\n' +
      'If this 1.0 is deliberate, re-run with ALLOW_MAJOR_RELEASE=1.'
  )
  process.exit(1)
}

const versions = [...new Set(releases.map((r) => r.newVersion))].sort()
console.log(`Release plan stays pre-1.0 (${releases.length} package(s): ${versions.join(', ')}).`)
