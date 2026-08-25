/**
 * Guard against accidentally cutting a 1.0 release.
 *
 * macts is pre-1.0 on purpose: nothing has been published yet, and a 1.0 is a
 * stability promise the project has not made. Changesets can arrive at a major
 * bump without anyone writing a `major` changeset — its peer-dependency rule
 * majors any package that peer-depends on something receiving a non-patch
 * bump, and `fixed: [["@macts/*"]]` then propagates that single major across
 * every package in the workspace.
 *
 * This script computes the pending release plan and fails if any package would
 * land at >= 1.0.0. It runs in CI so the problem surfaces on the pull request
 * that introduces it, rather than in a "Version Packages" PR nobody expected.
 *
 * To cut a real 1.0 deliberately, add a `major` changeset AND set
 * `ALLOW_MAJOR_RELEASE=1` in the environment.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (process.env['ALLOW_MAJOR_RELEASE'] === '1') {
  console.log('ALLOW_MAJOR_RELEASE=1 — skipping the pre-1.0 release-plan guard.')
  process.exit(0)
}

// `changeset status --output` resolves its path relative to the working
// directory, so an OS temp path would be joined onto the repo root. Write
// inside the already-ignored pnpm cache directory instead.
const outputDir = join('node_modules', '.cache', 'macts')
const relativePlanPath = join(outputDir, 'release-plan.json')
mkdirSync(join(repoRoot, outputDir), { recursive: true })

let plan
try {
  execFileSync('pnpm', ['exec', 'changeset', 'status', `--output=${relativePlanPath}`], {
    cwd: repoRoot,
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  plan = JSON.parse(readFileSync(join(repoRoot, relativePlanPath), 'utf8'))
} catch (error) {
  console.error('Could not compute the changesets release plan.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
} finally {
  rmSync(join(repoRoot, relativePlanPath), { force: true })
}

const releases = Array.isArray(plan?.releases) ? plan.releases : []

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
