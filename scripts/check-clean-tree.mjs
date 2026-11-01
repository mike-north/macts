/**
 * Fail when the working tree differs from the committed tree under the given
 * paths, naming every differing file.
 *
 * Usage: `node scripts/check-clean-tree.mjs <path>...`, run from the repository
 * (any directory inside it).
 *
 * `pnpm generate:check` runs this over `packages` after regenerating, so it
 * catches each way generated output can drift from what is committed: a
 * modified file, a deleted file, and an untracked file, such as one a new
 * manifest entry emits that was never committed. A plain `git diff` sees only
 * the first two. Files the repository ignores (build output, installed
 * dependencies) are not changes.
 *
 * Exit status: 0 when the tree is clean under the paths, 1 when it is not,
 * and 2 when the check itself cannot run.
 */

import { spawnSync } from 'node:child_process'

const paths = process.argv.slice(2)
if (paths.length === 0) {
  console.error('Usage: node scripts/check-clean-tree.mjs <path>...')
  process.exit(2)
}

/** Run git, returning its stdout, or end the check when git fails. */
function git(args) {
  const run = spawnSync('git', args, { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 })
  if (run.error !== undefined || run.status !== 0) {
    console.error(`git ${args.join(' ')} failed: ${run.error?.message ?? run.stderr.trim()}`)
    process.exit(2)
  }
  return run.stdout
}

// `-z` keeps paths verbatim (no quoting). Each entry is `XY <path>`; a rename
// or copy is followed by one more NUL-terminated field, its source path.
const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...paths])
const fields = status.split('\0').filter((field) => field.length > 0)
const changes = []
for (let index = 0; index < fields.length; index++) {
  const field = fields[index]
  const code = field.slice(0, 2)
  changes.push({ code, path: field.slice(3) })
  if (code.includes('R') || code.includes('C')) index++
}

if (changes.length === 0) process.exit(0)

/** A human description of a porcelain status code. */
function describe(code) {
  if (code === '??') return 'untracked'
  if (code.includes('D')) return 'deleted'
  if (code.includes('A')) return 'added'
  if (code.includes('R')) return 'renamed'
  return 'modified'
}

console.error(
  `The working tree differs from the committed tree under ${paths.join(', ')} (${String(changes.length)} file(s)):`
)
for (const { code, path } of changes) {
  console.error(`  ${describe(code).padEnd(9)} ${path}`)
}
console.error('\nRegenerate with `pnpm generate` and commit the result.')

const diff = git(['--no-pager', 'diff', '--', ...paths])
if (diff.length > 0) {
  console.error('\nChanges to tracked files:\n')
  process.stderr.write(diff)
}
process.exit(1)
