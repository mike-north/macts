/**
 * Harness for the packed-install UAT: builds a consumer project the way a
 * user's would be, from packed tarballs rather than workspace links.
 *
 * It packs the built `@macts/contracts`, `@macts/core`, `@macts/runtime`, and
 * `@macts/sdk`, plus the real `@macts/notes` app package, with `pnpm pack`
 * (which rewrites `workspace:` and `catalog:` ranges to real versions, as
 * publishing does), packs a small hand-written app package that exposes its
 * contract at the `/contract` subpath, installs all of them into a fresh
 * temporary project with npm, and offers helpers to inspect the installed
 * tree and run consumer programs against it.
 *
 * Third-party dependencies come from the npm registry; every `@macts/*`
 * package comes from its tarball.
 */

import { execFile } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** The repository root. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/** Static files the consumer project is built from. */
const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

/** The workspace packages a remote-and-local SDK install consists of. */
export const PACKED_PACKAGES = ['contracts', 'core', 'runtime', 'sdk'] as const

/** One of {@link PACKED_PACKAGES}. */
export type PackedPackage = (typeof PACKED_PACKAGES)[number]

/**
 * The real generated app packages installed next to the SDK. Their
 * `@macts/cli`, `clipanion`, and `typanion` peers are optional, so an install
 * that wants only the SDK client never receives them.
 */
export const APP_PACKAGES = ['notes'] as const

/** One of {@link APP_PACKAGES}. */
export type AppPackage = (typeof APP_PACKAGES)[number]

/** The fixture app package's name, as consumer programs import it. */
export const FIXTURE_APP = '@macts-fixture/widgets'

/**
 * npm, resolved next to the running Node so a version manager's shim is not
 * needed; falls back to `npm` on `PATH`.
 */
function npmCommand(): string {
  const beside = join(dirname(process.execPath), 'npm')
  return existsSync(beside) ? beside : 'npm'
}

/**
 * `npm_*` variables passed through to child processes: where npm caches,
 * which registry it uses, and its configuration files. Deliberate settings of
 * the machine running the test.
 */
const KEPT_NPM_VARIABLES = new Set([
  'npm_config_cache',
  'npm_config_registry',
  'npm_config_userconfig',
  'npm_config_globalconfig',
])

/**
 * The environment for package-manager child processes: the parent's, without
 * the other `npm_*` variables a parent `pnpm run` sets (script metadata and
 * pnpm's own settings), so npm is configured as it would be for a user.
 */
function childEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => {
      const lower = key.toLowerCase()
      return !lower.startsWith('npm_') || KEPT_NPM_VARIABLES.has(lower)
    })
  )
}

/**
 * Run a command and return its standard output.
 *
 * @throws An error carrying the command's standard error when it exits non-zero.
 */
export async function run(command: string, args: readonly string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, [...args], {
      cwd,
      env: childEnv(),
      maxBuffer: 16 * 1024 * 1024,
    })
    return stdout
  } catch (error) {
    const stderr = (error as { stderr?: unknown }).stderr
    throw new Error(
      `${basename(command)} ${args.join(' ')} failed in ${cwd}\n${typeof stderr === 'string' ? stderr : ''}`,
      { cause: error }
    )
  }
}

/** Read a package manifest's version. */
function versionOf(packageDir: string): string {
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
    version: string
  }
  return manifest.version
}

/** The only `.tgz` file in `dir`. */
function onlyTarball(dir: string): string {
  const tarballs = readdirSync(dir).filter((file) => file.endsWith('.tgz'))
  if (tarballs.length !== 1 || tarballs[0] === undefined) {
    throw new Error(`Expected one tarball in ${dir}, found ${String(tarballs.length)}`)
  }
  return join(dir, tarballs[0])
}

/** Paths to the packed tarballs, by package. */
export type Tarballs = Readonly<Record<PackedPackage | AppPackage | 'app', string>>

/**
 * Pack every workspace package, the real app packages, and the fixture app into `<root>/tarballs`.
 *
 * Each tarball is packed into its own staging directory and renamed to a
 * stable name, so nothing depends on the version in pnpm's file name.
 */
export async function packAll(root: string): Promise<Tarballs> {
  const tarballDir = join(root, 'tarballs')
  mkdirSync(tarballDir, { recursive: true })

  const packed: Partial<Record<PackedPackage | AppPackage | 'app', string>> = {}
  for (const name of [...PACKED_PACKAGES, ...APP_PACKAGES]) {
    const staging = join(root, 'staging', name)
    mkdirSync(staging, { recursive: true })
    await run('pnpm', ['pack', '--pack-destination', staging], join(REPO_ROOT, 'packages', name))
    const target = join(tarballDir, `macts-${name}.tgz`)
    renameSync(onlyTarball(staging), target)
    packed[name] = target
  }

  // The app package depends on the exact packed contracts version, as a
  // published app package depends on its release.
  const appDir = join(root, 'app')
  cpSync(join(FIXTURES, 'app'), appDir, { recursive: true })
  const appManifestPath = join(appDir, 'package.json')
  const appManifest = JSON.parse(readFileSync(appManifestPath, 'utf8')) as {
    dependencies: Record<string, string>
  }
  appManifest.dependencies['@macts/contracts'] = versionOf(join(REPO_ROOT, 'packages', 'contracts'))
  writeFileSync(appManifestPath, `${JSON.stringify(appManifest, null, 2)}\n`)
  const appStaging = join(root, 'staging', 'app')
  mkdirSync(appStaging, { recursive: true })
  await run(npmCommand(), ['pack', '--pack-destination', appStaging, '--loglevel=error'], appDir)
  const appTarball = join(tarballDir, 'fixture-app.tgz')
  renameSync(onlyTarball(appStaging), appTarball)
  packed.app = appTarball

  return packed as Tarballs
}

/**
 * Create a consumer project at `dir` that depends on every tarball, copy the
 * consumer programs into it, and install with npm.
 */
export async function installConsumer(dir: string, tarballs: Tarballs): Promise<void> {
  mkdirSync(dir, { recursive: true })
  const manifest = {
    name: 'packed-install-consumer',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: {
      '@macts/contracts': `file:${tarballs.contracts}`,
      '@macts/core': `file:${tarballs.core}`,
      '@macts/runtime': `file:${tarballs.runtime}`,
      '@macts/sdk': `file:${tarballs.sdk}`,
      '@macts/notes': `file:${tarballs.notes}`,
      [FIXTURE_APP]: `file:${tarballs.app}`,
    },
  }
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  cpSync(join(FIXTURES, 'consumer'), dir, { recursive: true })
  await run(
    npmCommand(),
    ['install', '--no-audit', '--no-fund', '--no-package-lock', '--loglevel=error'],
    dir
  )
}

/** Every path under `dir`, relative to it, without following symlinks. */
function walk(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
}

/** Installed native addons: compiled `*.node` modules and `binding.gyp` build files. */
export function findNativeAddons(projectDir: string): string[] {
  return walk(join(projectDir, 'node_modules')).filter(
    (path) => path.endsWith('.node') || basename(path) === 'binding.gyp'
  )
}

/** The names of every installed `@macts/*` package, sorted. */
export function installedMactsPackages(projectDir: string): string[] {
  return readdirSync(join(projectDir, 'node_modules', '@macts'))
    .map((name) => `@macts/${name}`)
    .sort()
}

/** Whether `packageName` is installed in the project. */
export function isInstalled(projectDir: string, packageName: string): boolean {
  return existsSync(join(projectDir, 'node_modules', ...packageName.split('/'), 'package.json'))
}

/** Every installed copy of `packageName`, as directories relative to the project. */
export function findInstalledCopies(projectDir: string, packageName: string): string[] {
  const suffix = join('node_modules', ...packageName.split('/'))
  return walk(join(projectDir, 'node_modules'))
    .map((path) => join('node_modules', path))
    .filter((path) => path.endsWith(`${sep}${suffix}`) || path === suffix)
    .filter((path) => existsSync(join(projectDir, path, 'package.json')))
}

/** Run a consumer program with the current Node and parse the JSON it prints. */
export async function runConsumer(projectDir: string, program: string): Promise<unknown> {
  const stdout = await run(process.execPath, [program], projectDir)
  return JSON.parse(stdout) as unknown
}

/**
 * Type-check `brand-check.ts` against the installed packages with the
 * workspace's TypeScript.
 *
 * @returns The compiler output; empty when the check passes.
 * @throws When the compiler reports an error.
 */
export async function typecheckBrandCheck(projectDir: string): Promise<string> {
  const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022', 'DOM'],
      types: [],
      strict: true,
      noEmit: true,
      // The check is about the consumer's view of the SDK; the installed
      // declaration files themselves are covered by each package's own build.
      skipLibCheck: true,
    },
    files: ['brand-check.ts'],
  }
  writeFileSync(join(projectDir, 'tsconfig.json'), `${JSON.stringify(config, null, 2)}\n`)
  return run(process.execPath, [tsc, '-p', 'tsconfig.json'], projectDir)
}
