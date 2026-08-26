/**
 * Guard against accidentally cutting a 1.0 release.
 *
 * macts is pre-1.0 on purpose. Changesets can arrive at a major bump without
 * anyone writing a `major` changeset: its peer-dependency rule majors any
 * package that peer-depends on something receiving a non-patch bump, and
 * `fixed: [["@macts/*"]]` then propagates that single major across every
 * package in the workspace.
 *
 * Two things are checked, because a release passes through two distinct states
 * and either one can carry an accidental major:
 *
 * 1. **The pending plan** — what the accumulated changesets would produce. This
 *    catches the problem on the pull request that introduces it.
 * 2. **The versions on disk** — what the manifests already say. This matters on
 *    a "Version Packages" commit, where the changesets have been consumed (so
 *    the plan is empty) but the manifests have already been rewritten to the
 *    new version. Checking only the plan would wave that commit straight
 *    through to publish, which is precisely the release boundary this guard
 *    exists to defend.
 *
 * The plan is read through `@changesets/get-release-plan`, which assembles from
 * the changeset files, the workspace manifests, and any pre-release state on
 * disk. Deliberately not the `changeset status` CLI: that resolves changed
 * packages against the base branch via git, which fails on CI's shallow
 * checkout where `main` has no local ref.
 *
 * To cut a real 1.0 deliberately, add a `major` changeset AND set
 * `ALLOW_MAJOR_RELEASE=1` in the environment.
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPackages } from '@manypkg/get-packages'
import getReleasePlanModule from '@changesets/get-release-plan'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (process.env['ALLOW_MAJOR_RELEASE'] === '1') {
  console.log('ALLOW_MAJOR_RELEASE=1 — skipping the pre-1.0 release-plan guard.')
  process.exit(0)
}

/**
 * True when a version string's major component is 1 or greater.
 *
 * Compares the parsed major directly rather than using a semver range, which
 * keeps prereleases honest: `1.0.0-next.0` is still a 1.0.
 */
function isMajorAtLeastOne(version) {
  const major = Number.parseInt(String(version).split('.')[0] ?? '', 10)
  return Number.isFinite(major) && major >= 1
}

// The package is CJS with a `default` export; interop shape varies by loader.
const getReleasePlan = getReleasePlanModule?.default ?? getReleasePlanModule

let releases
let workspacePackages
try {
  const plan = await getReleasePlan(repoRoot)
  releases = Array.isArray(plan?.releases) ? plan.releases : []
  workspacePackages = (await getPackages(repoRoot)).packages
} catch (error) {
  console.error('Could not inspect the workspace release state.')
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
}

// Published packages only — a private package's version is never released.
const onDisk = workspacePackages
  .filter((pkg) => pkg.packageJson.private !== true)
  .filter((pkg) => isMajorAtLeastOne(pkg.packageJson.version))
  .map((pkg) => ({ name: pkg.packageJson.name, version: pkg.packageJson.version }))

const planned = releases
  .filter((release) => isMajorAtLeastOne(release.newVersion))
  .map((release) => ({
    name: release.name,
    version: release.newVersion,
    from: release.oldVersion,
    type: release.type,
  }))

function report(label, entries, format) {
  return (
    `${label} (${entries.length}):\n` +
    entries.slice(0, 10).map(format).join('\n') +
    (entries.length > 10 ? `\n  ...and ${entries.length - 10} more` : '')
  )
}

if (onDisk.length > 0 || planned.length > 0) {
  const sections = []
  if (onDisk.length > 0) {
    sections.push(
      report(
        'Package manifests already at 1.0 or above',
        onDisk,
        (p) => `  ${p.name}: ${p.version}`
      )
    )
  }
  if (planned.length > 0) {
    sections.push(
      report(
        'Release plan would publish at 1.0 or above',
        planned,
        (p) => `  ${p.name}: ${p.from} -> ${p.version} (${p.type})`
      )
    )
  }
  console.error(
    sections.join('\n\n') +
      '\n\nmacts is intentionally pre-1.0. A major bump usually means either a stray\n' +
      "`major` changeset, or a peerDependencies edge tripping Changesets' peer\n" +
      'major-bump rule (see RELEASING.md, "Staying pre-1.0").\n\n' +
      'If this 1.0 is deliberate, re-run with ALLOW_MAJOR_RELEASE=1.'
  )
  process.exit(1)
}

const publishable = workspacePackages.filter((pkg) => pkg.packageJson.private !== true).length
if (releases.length === 0) {
  console.log(
    `No pending releases. ${publishable} publishable package(s) are all below 1.0 on disk.`
  )
  process.exit(0)
}

const versions = [...new Set(releases.map((r) => r.newVersion))].sort()
console.log(
  `Release plan stays pre-1.0 (${releases.length} package(s): ${versions.join(', ')}), ` +
    `and all ${publishable} publishable manifest(s) on disk are below 1.0.`
)
