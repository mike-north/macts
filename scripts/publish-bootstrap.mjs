#!/usr/bin/env node
/**
 * Batch bootstrap-publish every publishable @macts/* package to npm.
 *
 * Exists because trusted publishing (OIDC) cannot publish a package that has
 * no trusted publisher yet, and after the 1.0.0-next.0 unpublish every package
 * is a first-timer again. This performs the manual publish that re-establishes
 * them, after which `npm trust github ...` lets CI take over.
 *
 * SAFETY: macts is deliberately pre-1.0. This script refuses to publish
 * anything whose major version is not 0. That check runs over EVERY candidate
 * before ANY package is published, so a single stray version aborts the whole
 * run rather than leaving a partial publish with a 1.x in it. It is checked
 * again immediately before each individual publish.
 *
 * Resumable by design: any version already present on the registry is skipped,
 * so re-running after an interruption (a failed 2FA prompt, a network blip)
 * continues where it left off rather than erroring out.
 *
 * Usage:
 *   node publish-bootstrap.mjs --dry-run        # validate + show the plan, publish nothing
 *   node publish-bootstrap.mjs                  # publish (prompts once to confirm)
 *   node publish-bootstrap.mjs --yes            # publish without the confirmation prompt
 *   node publish-bootstrap.mjs --otp 123456     # pass a TOTP code through to npm
 *   node publish-bootstrap.mjs --tag next       # publish under a non-latest dist-tag
 *   node publish-bootstrap.mjs --delay 1500     # pause between publishes (ms)
 *   node publish-bootstrap.mjs --only @macts/core,@macts/cli
 *
 * Publishes strictly sequentially. npm's browser-based 2FA opens a tab per
 * publish; running these in parallel would open many at once.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const valueOf = (f, dflt) => {
  const i = args.indexOf(f)
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt
}

const DRY_RUN = has('--dry-run')
const ASSUME_YES = has('--yes')
const OTP = valueOf('--otp', null)
const DIST_TAG = valueOf('--tag', 'latest')
const DELAY_MS = Number.parseInt(valueOf('--delay', '0'), 10)
const ONLY = valueOf('--only', null)
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const MAX_ALLOWED_MAJOR = 0

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
}

function die(message) {
  console.error(`\n${c.red('ABORT')}  ${message}\n`)
  process.exit(1)
}

/** Parse a semver version into its numeric parts, or null if unparseable. */
function parseVersion(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(version))
  if (!m) return null
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? null,
  }
}

// ---------------------------------------------------------------------------
// Phase 0 — environment
// ---------------------------------------------------------------------------

// A dry run only validates versions, which needs no registry access — so it
// stays useful before `npm login`, which is exactly when you want to confirm
// the 0.x.y gate holds.
let whoami = null
try {
  whoami = execFileSync('npm', ['whoami'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
} catch {
  if (!DRY_RUN) {
    die('Not logged in to npm. Run `npm login` first (this script never handles credentials).')
  }
}
console.log(`${c.bold('npm user')}      ${whoami ?? c.yellow('not logged in (dry run only)')}`)
console.log(`${c.bold('dist-tag')}      ${DIST_TAG}`)
console.log(
  `${c.bold('mode')}          ${DRY_RUN ? c.yellow('DRY RUN — nothing will publish') : 'publish'}`
)

// ---------------------------------------------------------------------------
// Phase 1 — enumerate and validate EVERY candidate before publishing ANY
// ---------------------------------------------------------------------------

let workspace
try {
  workspace = JSON.parse(
    execFileSync('pnpm', ['list', '-r', '--depth', '-1', '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  )
} catch (error) {
  die(`Could not enumerate the workspace: ${error instanceof Error ? error.message : error}`)
}

const candidates = workspace
  .filter((p) => p.name && p.private !== true)
  .map((p) => ({ name: p.name, version: p.version, path: p.path }))
  .filter((p) => !ONLY || ONLY.includes(p.name))

if (candidates.length === 0) die('No publishable packages found.')

const violations = []
for (const pkg of candidates) {
  const v = parseVersion(pkg.version)
  if (!v) {
    violations.push(`${pkg.name}@${pkg.version} — not a parseable semver version`)
    continue
  }
  if (v.major > MAX_ALLOWED_MAJOR) {
    violations.push(`${pkg.name}@${pkg.version} — major version ${v.major} is outside 0.x.y`)
  }
  if (v.major === 0 && v.minor === 0 && v.patch === 0 && !v.prerelease) {
    violations.push(`${pkg.name}@${pkg.version} — 0.0.0 is a placeholder, not a releasable version`)
  }
}

if (violations.length > 0) {
  console.error(`\n${c.red('Version policy violation — nothing has been published.')}`)
  console.error(`macts must stay within 0.x.y. Offending packages:\n`)
  for (const v of violations) console.error(`  ${c.red('✗')} ${v}`)
  console.error(
    `\nFix the versions (or the changeset that produced them) and re-run.` +
      `\nThis check is intentionally not overridable by a flag.\n`
  )
  process.exit(1)
}

const distinct = [...new Set(candidates.map((p) => p.version))].sort()
console.log(
  `${c.bold('validated')}     ${c.green(`${candidates.length} packages, all within 0.x.y`)} ${c.dim(`(${distinct.join(', ')})`)}`
)

// ---------------------------------------------------------------------------
// Phase 2 — skip anything already on the registry (makes re-runs safe)
// ---------------------------------------------------------------------------

const toPublish = []
const alreadyPublished = []
if (whoami === null) {
  console.log(
    `${c.bold('checking')}      ${c.yellow('skipped — not logged in, cannot query the registry')}`
  )
  toPublish.push(...candidates)
} else {
  process.stdout.write(`${c.bold('checking')}      registry for already-published versions`)
  for (const pkg of candidates) {
    const probe = spawnSync('npm', ['view', `${pkg.name}@${pkg.version}`, 'version'], {
      encoding: 'utf8',
    })
    const found = probe.status === 0 && probe.stdout.trim() !== ''
    if (found) alreadyPublished.push(pkg)
    else toPublish.push(pkg)
    process.stdout.write('.')
  }
  process.stdout.write('\n')
}

if (alreadyPublished.length > 0) {
  console.log(
    `${c.bold('skipping')}      ${alreadyPublished.length} already published at this version`
  )
}
if (toPublish.length === 0) {
  console.log(
    `\n${c.green('Nothing to do — every package is already published at its version.')}\n`
  )
  process.exit(0)
}

// Publish dependencies before dependents. npm does not enforce this, but it
// keeps the registry consistent for anyone installing mid-run.
const nameSet = new Set(toPublish.map((p) => p.name))
const depsOf = new Map()
for (const pkg of toPublish) {
  const manifest = JSON.parse(
    execFileSync(
      'node',
      ['-p', `JSON.stringify(require(${JSON.stringify(pkg.path + '/package.json')}))`],
      {
        encoding: 'utf8',
      }
    )
  )
  const deps = new Set(
    [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ].filter((d) => nameSet.has(d))
  )
  depsOf.set(pkg.name, deps)
}
const ordered = []
const placed = new Set()
while (ordered.length < toPublish.length) {
  const ready = toPublish.filter(
    (p) => !placed.has(p.name) && [...depsOf.get(p.name)].every((d) => placed.has(d))
  )
  // A dependency cycle would stall this loop; fall back to source order.
  const batch = ready.length > 0 ? ready : toPublish.filter((p) => !placed.has(p.name))
  for (const p of batch.sort((a, b) => a.name.localeCompare(b.name))) {
    ordered.push(p)
    placed.add(p.name)
  }
}

console.log(`\n${c.bold(`Will publish ${ordered.length} package(s) at dist-tag "${DIST_TAG}":`)}`)
for (const p of ordered.slice(0, 8)) console.log(`  ${p.name}@${p.version}`)
if (ordered.length > 8) console.log(`  ${c.dim(`...and ${ordered.length - 8} more`)}`)

if (DRY_RUN) {
  console.log(`\n${c.yellow('Dry run complete — nothing was published.')}\n`)
  process.exit(0)
}

if (!ASSUME_YES) {
  const rl = createInterface({ input: stdin, output: stdout })
  const answer = await rl.question(`\nProceed? Type ${c.bold('publish')} to continue: `)
  rl.close()
  if (answer.trim() !== 'publish') die('Not confirmed — nothing was published.')
}

console.log(
  `\n${c.dim('npm may open a browser tab for two-factor authorization on each publish.')}\n` +
    `${c.dim('Publishing sequentially so prompts arrive one at a time. Ctrl-C is safe —')}\n` +
    `${c.dim('re-running skips whatever already succeeded.')}\n`
)

// ---------------------------------------------------------------------------
// Phase 3 — publish
// ---------------------------------------------------------------------------

const succeeded = []
const failed = []

for (const [i, pkg] of ordered.entries()) {
  const label = `[${i + 1}/${ordered.length}] ${pkg.name}@${pkg.version}`

  // Defense in depth: re-check this exact package right before publishing it.
  const v = parseVersion(pkg.version)
  if (!v || v.major > MAX_ALLOWED_MAJOR) {
    failed.push({ pkg, reason: 'failed the 0.x.y check immediately before publish' })
    console.error(`${c.red('✗')} ${label} — refused, outside 0.x.y`)
    continue
  }

  process.stdout.write(`${label} ... `)
  const publishArgs = ['publish', '--access', 'public', '--no-git-checks', '--tag', DIST_TAG]
  if (OTP) publishArgs.push('--otp', OTP)

  const result = spawnSync('pnpm', publishArgs, {
    cwd: pkg.path,
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8',
  })

  if (result.status === 0) {
    succeeded.push(pkg)
    console.log(c.green('published'))
  } else {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    const firstError =
      output
        .split('\n')
        .find((l) => /error|ERR!/i.test(l))
        ?.trim() ?? output.split('\n').slice(-1)[0]
    failed.push({ pkg, reason: firstError })
    console.log(c.red('FAILED'))
    console.log(c.dim(`      ${firstError}`))
  }

  if (DELAY_MS > 0 && i < ordered.length - 1) {
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${c.bold('Summary')}`)
console.log(`  published : ${c.green(String(succeeded.length))}`)
console.log(`  skipped   : ${alreadyPublished.length} (already on the registry)`)
console.log(`  failed    : ${failed.length > 0 ? c.red(String(failed.length)) : '0'}`)

if (failed.length > 0) {
  console.log(`\n${c.red('Failures:')}`)
  for (const f of failed) console.log(`  ${f.pkg.name}@${f.pkg.version} — ${f.reason}`)
  console.log(`\nRe-run this script to retry only the failures.\n`)
  process.exit(1)
}

console.log(
  `\n${c.green('All packages published.')}\n\n` +
    `Next:\n` +
    `  1. Tag the release:      pnpm changeset tag && git push --follow-tags\n` +
    `  2. Grant CI publish rights so OIDC works for the next release:\n` +
    `     for pkg in packages/*/package.json; do\n` +
    `       name=$(node -p "require('./$pkg').name")\n` +
    `       npm trust github "$name" --repo mike-north/macts --file release.yml --allow-publish --yes\n` +
    `     done\n`
)
