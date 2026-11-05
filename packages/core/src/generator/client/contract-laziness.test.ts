/**
 * The generated contract loads its manifest lazily, as compiled.
 *
 * `loadManifest` is a dynamic import of the manifest data module, so that
 * importing `@macts/<app>/contract` (which every client does, including
 * remote ones) never loads the manifest. That holds only if the package
 * build keeps the manifest in its own chunk; a build that inlined it (for
 * example with code splitting turned off) would load it eagerly, and a text
 * check of the generated source cannot see that.
 *
 * So this test generates the Jotter fixture's whole client package into a
 * temporary directory, builds it with tsup using the package's generated
 * `tsup.config.ts`, and imports the compiled `dist/contract/index.js` in a
 * subprocess whose module load hook records every module URL loaded. The
 * manifest chunk must be absent after the import and present after
 * `loadManifest()`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (the contract and its lazy manifest)
 * @see https://nodejs.org/api/module.html#customization-hooks
 * @see https://tsup.egoist.dev/#code-splitting
 */

import { spawnSync } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { jotterManifest } from '../contract/test-fixtures.js'
import { generateClientPackage } from './index.js'

const PACKAGE_ROOT = process.cwd()
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..')
const TSUP_PACKAGE = resolve(PACKAGE_ROOT, 'node_modules/tsup')
const TSUP_CLI = join(TSUP_PACKAGE, 'dist/cli-default.js')
const CONTRACTS_PACKAGE = resolve(PACKAGE_ROOT, '../contracts')

/**
 * A text the manifest data carries and the contract code does not: the
 * fixture's bundle id. (The HTTP client entry carries it too, which is why the
 * manifest chunk is found through the contract's dynamic import.)
 */
const MANIFEST_MARKER = 'com.example.jotter'

/**
 * Module load hooks, run off the main thread. Every URL loaded is recorded;
 * the main thread asks for the list over a port, and because the request is
 * answered on the hooks thread after every earlier load hook has run, the
 * reply is complete.
 */
const HOOKS_SOURCE = `
const loaded = []
export function initialize({ port }) {
  port.on('message', (reply) => reply.postMessage([...loaded]))
  port.unref()
}
export async function load(url, context, nextLoad) {
  loaded.push(url)
  return nextLoad(url, context)
}
`

/**
 * Import the compiled contract, then load its manifest, printing the module
 * URLs loaded at each point as JSON.
 */
const DRIVER_SOURCE = `
import { register } from 'node:module'
import { MessageChannel } from 'node:worker_threads'

const { port1: hooks, port2 } = new MessageChannel()
register('./hooks.mjs', import.meta.url, { data: { port: port2 }, transferList: [port2] })

function loadedUrls() {
  return new Promise((resolve) => {
    const { port1, port2: reply } = new MessageChannel()
    port1.once('message', (urls) => {
      port1.close()
      resolve(urls)
    })
    hooks.postMessage(reply, [reply])
  })
}

const { jotterContract } = await import(process.argv[2])
const afterImport = await loadedUrls()
const manifest = await jotterContract.loadManifest()
const afterLoad = await loadedUrls()
hooks.close()
process.stdout.write(JSON.stringify({ afterImport, afterLoad, app: manifest.app.name }))
`

interface LoadTrace {
  readonly afterImport: string[]
  readonly afterLoad: string[]
  readonly app: string
}

function isLoadTrace(value: unknown): value is LoadTrace {
  return (
    typeof value === 'object' &&
    value !== null &&
    'afterImport' in value &&
    Array.isArray(value.afterImport) &&
    'afterLoad' in value &&
    Array.isArray(value.afterLoad) &&
    'app' in value &&
    typeof value.app === 'string'
  )
}

let dir = ''
/** The contract entry, `dist/contract/index.js`, as a file URL. */
let contractUrl = ''
/** Every chunk the contract entry imports dynamically, as file URLs. */
const dynamicChunks: string[] = []
/** Every compiled module that carries manifest data, as file URLs. */
const manifestCarriers: string[] = []
let trace: LoadTrace

beforeAll(async () => {
  // Loaded module URLs are real paths, and the temporary directory may sit
  // behind a symlink (as /var does on macOS).
  dir = await realpath(await mkdtemp(join(tmpdir(), 'macts-contract-laziness-')))
  const generated = generateClientPackage(jotterManifest(), {
    appName: 'jotter',
    clientPackageName: '@macts/jotter',
  })
  expect(generated.errors).toEqual([])
  for (const file of generated.files) {
    const path = join(dir, file.path)
    await mkdir(dirname(path), { recursive: true })
    // The generated tsconfig extends the workspace base config by a path
    // relative to packages/<app>; point it at the same file from here.
    const content =
      file.path === 'tsconfig.json'
        ? file.content.replace('../../tsconfig.base.json', join(REPO_ROOT, 'tsconfig.base.json'))
        : file.content
    await writeFile(path, content)
  }
  // The generated tsup.config.ts imports `defineConfig` from tsup, and the
  // compiled contract imports @macts/contracts at run time.
  await mkdir(join(dir, 'node_modules', '@macts'), { recursive: true })
  await symlink(TSUP_PACKAGE, join(dir, 'node_modules', 'tsup'), 'dir')
  await symlink(CONTRACTS_PACKAGE, join(dir, 'node_modules', '@macts', 'contracts'), 'dir')

  // The package build is `tsup` with the generated config. Declarations are
  // skipped: they need every peer's types and do not affect which JavaScript
  // chunks load.
  const build = spawnSync(process.execPath, [TSUP_CLI, '--no-dts'], {
    cwd: dir,
    encoding: 'utf-8',
  })
  if (build.status !== 0) {
    throw new Error(`the generated package does not build:\n${build.stdout}${build.stderr}`)
  }

  const dist = join(dir, 'dist')
  contractUrl = pathToFileURL(join(dist, 'contract', 'index.js')).href
  // The root facade and /contract entry share a static chunk. Follow that
  // closure before finding the lazy manifest edge; entry wrappers may re-export.
  const staticModules = [contractUrl]
  for (const url of staticModules) {
    const code = await readFile(new URL(url), 'utf8')
    dynamicChunks.push(
      ...[...code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map(
        (match) => new URL(match[1] ?? '', url).href
      )
    )
    for (const match of code.matchAll(/\bfrom\s*["'](\.[^"']+)["']/g)) {
      const child = new URL(match[1] ?? '', url).href
      if (!staticModules.includes(child)) staticModules.push(child)
    }
  }
  const scripts = (await readdir(dist, { recursive: true })).filter((path) => path.endsWith('.js'))
  for (const path of scripts) {
    if ((await readFile(join(dist, path), 'utf-8')).includes(MANIFEST_MARKER)) {
      manifestCarriers.push(pathToFileURL(join(dist, path)).href)
    }
  }

  await writeFile(join(dir, 'hooks.mjs'), HOOKS_SOURCE)
  await writeFile(join(dir, 'driver.mjs'), DRIVER_SOURCE)
  const run = spawnSync(process.execPath, [join(dir, 'driver.mjs'), contractUrl], {
    cwd: dir,
    encoding: 'utf-8',
  })
  if (run.status !== 0) throw new Error(`the compiled contract does not load:\n${run.stderr}`)
  const parsed: unknown = JSON.parse(run.stdout)
  if (!isLoadTrace(parsed)) throw new Error(`unexpected driver output: ${run.stdout}`)
  trace = parsed
}, 120_000)

afterAll(async () => {
  if (dir !== '') await rm(dir, { recursive: true, force: true })
})

describe('the compiled contract', () => {
  it('keeps the manifest in a chunk of its own, which the contract imports dynamically', () => {
    expect(dynamicChunks).toHaveLength(1)
    expect(manifestCarriers).toContain(dynamicChunks[0])
    expect(manifestCarriers).not.toContain(contractUrl)
  })

  it('loads no module that carries the manifest when the contract is imported', () => {
    // Guards against a vacuous pass: the hook saw the contract itself load.
    expect(trace.afterImport).toContain(contractUrl)
    expect(trace.afterImport.filter((url) => manifestCarriers.includes(url))).toEqual([])
  })

  it('loads the manifest chunk when loadManifest is called', () => {
    expect(trace.afterLoad).toContain(dynamicChunks[0])
    expect(trace.app).toBe('Jotter')
  })

  it('loads neither the HTTP client nor the CLI with the contract', () => {
    const dist = pathToFileURL(join(dir, 'dist')).href
    expect(trace.afterLoad).not.toContain(`${dist}/index.js`)
    expect(trace.afterLoad).not.toContain(`${dist}/cli/index.js`)
  })
})
