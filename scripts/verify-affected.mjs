/**
 * Run the checks a change needs, and only those, during development.
 *
 * Usage:
 *   pnpm verify:affected [--base <ref>] [--targets <t1,t2>] [<nx args>...]
 *
 * By default this runs the `build`, `lint`, `typecheck`, `test` and
 * `test:types` targets (`test` excludes the real-app UAT and `test:local`
 * suites) for the projects a change touches and every project that depends on
 * them, through `nx affected`. Nx's local cache replays any task whose inputs
 * are unchanged.
 *
 * The change is everything that differs from the merge base with `--base`
 * (default `main`, the `defaultBase` in nx.json): committed, staged, unstaged
 * and untracked files alike, so a brand-new file is selected before it is
 * committed. Renames count as a deletion plus an addition, as they do for Nx.
 *
 * Nx maps a file to a project when the file sits inside that project, and
 * marks every project affected when a workspace file is an input to any
 * target (for example `tsconfig.base.json`, `eslint.config.js`,
 * `vitest.config.ts`, `api-extractor.base.json`, `manifests/`, the root
 * `README.md`). For every other changed file this script decides:
 *
 * - Documentation, generated API docs and changesets need no check.
 * - Manifests, the generator script and the generator need the generator
 *   freshness check, which this script names but does not run, because it
 *   regenerates into the working tree.
 * - Formatting config needs `pnpm format:check`, and workflow changes need CI;
 *   both are named likewise.
 * - Any other file outside a project is ambiguous, so the script widens to
 *   `nx run-many` over every project.
 *
 * This is the fast path for iteration. It does not replace the full gate in
 * CI (`pnpm build`, `pnpm generate:check`, `pnpm typecheck`, `pnpm lint`,
 * `pnpm test`, `pnpm test:types`, `pnpm format:check`).
 */

import { spawnSync } from 'node:child_process'

const DEFAULT_TARGETS = ['build', 'lint', 'typecheck', 'test', 'test:types']

/** Changed files outside every project that need no check of their own. */
const NO_CHECK = [
  /^[^/]+\.md$/,
  /^docs\//,
  /^phases\//,
  /^\.changeset\/.*\.md$/,
  /^LICENSE$/,
  /^\.claude\//,
]

/** Changed files that need a named wider gate, inside a project or not. */
const NAMED_GATES = [
  { pattern: /^manifests\//, gate: 'pnpm generate:check' },
  { pattern: /^scripts\/regenerate\.mjs$/, gate: 'pnpm generate:check' },
  { pattern: /^packages\/core\/src\/generator\//, gate: 'pnpm generate:check' },
  { pattern: /^(prettier\.config\.js|\.prettierignore)$/, gate: 'pnpm format:check' },
  { pattern: /^\.github\//, gate: 'the CI workflow on a pushed branch' },
]

/** Fail with a usage error. */
function usage(message) {
  process.stderr.write(`verify:affected: ${message}\n`)
  process.exit(2)
}

function parseArgs(argv) {
  const options = { base: 'main', targets: DEFAULT_TARGETS, passthrough: [] }
  const args = argv[0] === '--' ? argv.slice(1) : argv
  const valueOf = (arg, name, i) => {
    if (arg.startsWith(`${name}=`)) return { value: arg.slice(name.length + 1), next: i }
    if (i + 1 >= args.length) usage(`${name} needs a value`)
    return { value: args[i + 1], next: i + 1 }
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--base' || arg.startsWith('--base=')) {
      const { value, next } = valueOf(arg, '--base', i)
      options.base = value
      i = next
    } else if (arg === '--targets' || arg.startsWith('--targets=')) {
      const { value, next } = valueOf(arg, '--targets', i)
      options.targets = value
        .split(',')
        .map((target) => target.trim())
        .filter(Boolean)
      if (options.targets.length === 0) usage('--targets needs at least one target')
      i = next
    } else if (arg === '-t' || arg.startsWith('--target') || arg.startsWith('--head')) {
      usage(`${arg} is not supported; use --targets <t1,t2> (and compare against a --base ref)`)
    } else {
      options.passthrough.push(arg)
    }
  }
  if (!options.base) usage('--base needs a value')
  return options
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
    ...options,
  })
}

function git(args, cwd) {
  const result = run('git', args, { cwd })
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '')
    usage(`git ${args.join(' ')} failed`)
  }
  return result.stdout
}

/** Split NUL-separated git output, which leaves paths unquoted. */
function paths(text) {
  return text.split('\0').filter(Boolean)
}

function changedFiles(base, root) {
  const mergeBase = git(['merge-base', base, 'HEAD'], root).trim()
  const tracked = paths(git(['diff', '--name-only', '--no-renames', '-z', mergeBase], root))
  const untracked = paths(git(['ls-files', '--others', '--exclude-standard', '-z'], root))
  return [...new Set([...tracked, ...untracked])].sort()
}

function projectRoots(root) {
  const result = run('pnpm', ['exec', 'nx', 'graph', '--file=stdout'], { cwd: root })
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '')
    usage('could not read the Nx project graph')
  }
  const graph = JSON.parse(result.stdout)
  return Object.values(graph.graph.nodes).map((node) => `${node.data.root}/`)
}

function nx(args, root) {
  process.stdout.write(`\n> nx ${args.join(' ')}\n\n`)
  const result = run('pnpm', ['exec', 'nx', ...args], { cwd: root, stdio: 'inherit' })
  return result.status ?? 1
}

const options = parseArgs(process.argv.slice(2))
const root = git(['rev-parse', '--show-toplevel']).trim()
const files = changedFiles(options.base, root)
const roots = projectRoots(root)

const gates = new Map()
const ambiguous = []
for (const file of files) {
  const named = NAMED_GATES.find(({ pattern }) => pattern.test(file))
  if (named) gates.set(named.gate, [...(gates.get(named.gate) ?? []), file])
  if (roots.some((projectRoot) => file.startsWith(projectRoot))) continue
  if (named || NO_CHECK.some((pattern) => pattern.test(file))) continue
  ambiguous.push(file)
}

const targetArgs = ['-t', ...options.targets]
let status
if (ambiguous.length > 0) {
  process.stdout.write(
    `verify:affected: these changed files belong to no project, so every project is checked:\n` +
      ambiguous.map((file) => `  ${file}\n`).join('')
  )
  status = nx(['run-many', ...targetArgs, ...options.passthrough], root)
} else {
  status = nx(['affected', ...targetArgs, `--base=${options.base}`, ...options.passthrough], root)
}

if (gates.size > 0) {
  process.stdout.write('\nverify:affected: these changes also need a wider gate before review:\n')
  for (const [gate, gateFiles] of gates) {
    process.stdout.write(`  ${gate}\n${gateFiles.map((file) => `    ${file}\n`).join('')}`)
  }
}

process.exit(status)
