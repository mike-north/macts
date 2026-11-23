/**
 * Run the checks a change needs, and only those, during development.
 *
 * Usage:
 *   pnpm verify:affected [--base=<ref>] [--targets=<t1,t2>] [-- <nx args>]
 *
 * By default this runs the `build`, `lint`, `typecheck` and `test` targets
 * (`test` excludes the real-app UAT and `test:local` suites) for the projects
 * a change touches and every project that depends on them, through
 * `nx affected`. Nx's local cache replays any task whose inputs are unchanged.
 *
 * The change is everything that differs from the merge base with `--base`
 * (default `main`, the `defaultBase` in nx.json): committed, staged, unstaged
 * and untracked files alike, so a brand-new file is selected before it is
 * committed.
 *
 * Nx maps a file to a project when the file sits inside that project, and
 * marks every project affected when a root file is an input to any target
 * (`tsconfig.base.json`, `eslint.config.js`, `vitest.config.ts`,
 * `api-extractor.base.json`, the lockfile). For every other changed file this
 * script decides:
 *
 * - Documentation and changesets need no check.
 * - Manifests, the generator script and other inputs to `pnpm generate` need
 *   the generator freshness check, which this script names but does not run,
 *   because it regenerates into the working tree.
 * - Formatting config needs `pnpm format:check`, which is named likewise.
 * - Any other file outside a project is ambiguous, so the script widens to
 *   `nx run-many` over every project.
 *
 * This is the fast path for iteration. It does not replace the full gate in
 * CI (`pnpm build`, `pnpm generate:check`, `pnpm typecheck`, `pnpm lint`,
 * `pnpm test`, `pnpm test:types`, `pnpm format:check`).
 */

import { spawnSync } from 'node:child_process'

const DEFAULT_TARGETS = ['build', 'lint', 'typecheck', 'test']

/** Changed files outside every project that need no check. */
const NO_CHECK = [
  /^[^/]+\.md$/,
  /^docs\//,
  /^phases\//,
  /^\.changeset\/.*\.md$/,
  /^LICENSE$/,
  /^\.claude\//,
]

/** Changed files outside every project that need a named wider gate. */
const NAMED_GATES = [
  { pattern: /^manifests\//, gate: 'pnpm generate:check' },
  { pattern: /^scripts\/regenerate\.mjs$/, gate: 'pnpm generate:check' },
  { pattern: /^packages\/core\/src\/generator\//, gate: 'pnpm generate:check' },
  { pattern: /^(prettier\.config\.js|\.prettierignore)$/, gate: 'pnpm format:check' },
  { pattern: /^\.github\//, gate: 'the CI workflow on a pushed branch' },
]

function parseArgs(argv) {
  const options = { base: 'main', targets: DEFAULT_TARGETS, passthrough: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--') {
      options.passthrough.push(...argv.slice(i + 1))
      break
    }
    if (arg.startsWith('--base=')) options.base = arg.slice('--base='.length)
    else if (arg.startsWith('--targets='))
      options.targets = arg
        .slice('--targets='.length)
        .split(',')
        .map((target) => target.trim())
        .filter(Boolean)
    else options.passthrough.push(arg)
  }
  return options
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' })
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.stderr.write(`verify:affected: git ${args.join(' ')} failed\n`)
    process.exit(2)
  }
  return result.stdout
}

function lines(text) {
  return text.split('\n').filter(Boolean)
}

function changedFiles(base) {
  const mergeBase = git(['merge-base', base, 'HEAD']).trim()
  const tracked = lines(git(['diff', '--name-only', mergeBase]))
  const untracked = lines(git(['ls-files', '--others', '--exclude-standard']))
  return [...new Set([...tracked, ...untracked])].sort()
}

function projectRoots() {
  const result = spawnSync('pnpm', ['exec', 'nx', 'graph', '--file=stdout'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.stderr.write('verify:affected: could not read the Nx project graph\n')
    process.exit(2)
  }
  const graph = JSON.parse(result.stdout)
  return Object.values(graph.graph.nodes).map((node) => `${node.data.root}/`)
}

function nx(args) {
  process.stdout.write(`\n> nx ${args.join(' ')}\n\n`)
  const result = spawnSync('pnpm', ['exec', 'nx', ...args], { stdio: 'inherit' })
  return result.status ?? 1
}

const options = parseArgs(process.argv.slice(2))
const files = changedFiles(options.base)
const roots = projectRoots()

const gates = new Map()
const ambiguous = []
for (const file of files) {
  const named = NAMED_GATES.find(({ pattern }) => pattern.test(file))
  if (named) {
    gates.set(named.gate, [...(gates.get(named.gate) ?? []), file])
    continue
  }
  if (roots.some((root) => file.startsWith(root))) continue
  if (NO_CHECK.some((pattern) => pattern.test(file))) continue
  ambiguous.push(file)
}

const targetArgs = ['-t', ...options.targets]
let status
if (ambiguous.length > 0) {
  process.stdout.write(
    `verify:affected: these changed files belong to no project, so every project is checked:\n` +
      ambiguous.map((file) => `  ${file}\n`).join('')
  )
  status = nx(['run-many', ...targetArgs, ...options.passthrough])
} else {
  status = nx(['affected', ...targetArgs, `--base=${options.base}`, ...options.passthrough])
}

if (gates.size > 0) {
  process.stdout.write('\nverify:affected: these changes also need a wider gate before review:\n')
  for (const [gate, gateFiles] of gates) {
    process.stdout.write(`  ${gate}\n${gateFiles.map((file) => `    ${file}\n`).join('')}`)
  }
}

process.exit(status)
