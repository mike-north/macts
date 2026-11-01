/**
 * Harness for subprocess UATs of the `macts` host commands.
 *
 * Each test gets a fresh macts home whose plugins directory has two real,
 * built app pairs, {@link INSTALLED_APPS} (`@macts/<app>-server` and
 * `@macts/<app>`), linked into `plugins/node_modules/@macts`, the way
 * `macts mcp install <app>` lays out a hoisted install. The built CLI runs as a child process under a minimal
 * environment (no inherited `MACTS_*` variables, and `HOME` pointing into the
 * temporary directory), so nothing reads or writes the real `~/.macts`.
 */

import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** This package's root. */
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The repository root; the CLI runs from here so it finds the shipped manifests. */
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..')

/** The directory of a workspace package this package depends on. */
function dependencyDir(name: string): string {
  return realpathSync(join(PACKAGE_ROOT, 'node_modules', name))
}

/** The built CLI entry point. */
export const CLI_BIN = join(dependencyDir('@macts/cli'), 'dist', 'bin.js')

/** The apps whose server and app packages every macts home has installed, sorted. */
export const INSTALLED_APPS = ['notes', 'reminders'] as const

/** The repository root's shipped user docs, for checks on what they mention. */
export const SHIPPED_READMES = [
  join(REPO_ROOT, 'README.md'),
  join(REPO_ROOT, 'packages', 'cli', 'README.md'),
] as const

/** A temporary macts home with {@link INSTALLED_APPS} installed; dispose it after the test. */
export interface MactsHome {
  /** The directory `MACTS_HOME` points at. */
  readonly path: string
  /** Remove the directory. */
  dispose(): void
}

/** Create a macts home whose plugins directory holds the built packages of {@link INSTALLED_APPS}. */
export function createMactsHome(): MactsHome {
  const root = mkdtempSync(join(tmpdir(), 'macts-cli-host-'))
  const path = join(root, 'macts-home')
  const plugins = join(path, 'plugins')
  const scope = join(plugins, 'node_modules', '@macts')
  mkdirSync(scope, { recursive: true })
  writeFileSync(
    join(plugins, 'package.json'),
    JSON.stringify({
      name: 'macts-plugins',
      version: '1.0.0',
      private: true,
      dependencies: Object.fromEntries(INSTALLED_APPS.map((app) => [`@macts/${app}-server`, '*'])),
    })
  )
  for (const app of INSTALLED_APPS) {
    for (const name of [app, `${app}-server`]) {
      symlinkSync(dependencyDir(`@macts/${name}`), join(scope, name), 'dir')
    }
  }
  return {
    path,
    dispose() {
      rmSync(root, { recursive: true, force: true })
    },
  }
}

/**
 * The environment the CLI runs with: only what Node needs, plus `extra`.
 *
 * @remarks
 * Node is run by its absolute path (`process.execPath`), so a version
 * manager's shim on `PATH` is never involved.
 */
function minimalEnv(home: MactsHome, extra: Readonly<Record<string, string>>): NodeJS.ProcessEnv {
  return {
    PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
    HOME: dirname(home.path),
    TMPDIR: tmpdir(),
    MACTS_HOME: home.path,
    NO_COLOR: '1',
    ...extra,
  }
}

/** The outcome of a CLI run. */
export interface CliResult {
  readonly stdout: string
  readonly stderr: string
  readonly code: number
}

/** Run the built CLI to completion. */
export async function runCli(
  home: MactsHome,
  args: readonly string[],
  extraEnv: Readonly<Record<string, string>> = {}
): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI_BIN, ...args], {
      cwd: REPO_ROOT,
      env: minimalEnv(home, extraEnv),
    })
    return { stdout, stderr, code: 0 }
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; code?: number }
    return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '', code: failure.code ?? 1 }
  }
}

/** Create an API key holding exactly `permission`, through the CLI, and return its token. */
export async function createKey(home: MactsHome, permission: string): Promise<string> {
  const result = await runCli(home, [
    'api-key',
    'create',
    '--name',
    `uat-${permission}`,
    '--permission',
    permission,
    '--json',
  ])
  if (result.code !== 0) {
    throw new Error(`api-key create failed (${String(result.code)}): ${result.stderr}`)
  }
  const parsed = JSON.parse(result.stdout) as { data: { token: string } }
  return parsed.data.token
}

/** A port nothing is listening on at the moment of the call. */
export async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (address !== null && typeof address === 'object') resolvePort(address.port)
        else reject(new Error('Could not determine a free port'))
      })
    })
  })
}

/** A running `macts --serve` process. */
export interface ServeProcess {
  /** The server's base URL, as it reported it. */
  readonly url: string
  /** Everything written to stdout so far. */
  stdout(): string
  /** Everything written to stderr so far. */
  stderr(): string
  /** Stop the server and wait for the process to exit. */
  stop(): Promise<void>
}

/** How long the server may take to report that it is running. */
const READY_TIMEOUT_MS = 30_000

/** The line `macts --serve` prints once it is listening. */
const READY_LINE = /macts API server running at (\S+)/

/**
 * Start `macts --serve` on `port` and resolve once it reports that it is
 * listening and its health endpoint accepts a connection. Rejects with its
 * output and exit status if it exits first, never reports, or reports a URL
 * that refuses connections.
 */
export async function startServe(
  home: MactsHome,
  port: number,
  extraEnv: Readonly<Record<string, string>> = {}
): Promise<ServeProcess> {
  const child = spawn(process.execPath, [CLI_BIN, '--serve', '--port', String(port)], {
    cwd: REPO_ROOT,
    env: minimalEnv(home, extraEnv),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf-8').on('data', (chunk: string) => (stdout += chunk))
  child.stderr.setEncoding('utf-8').on('data', (chunk: string) => (stderr += chunk))

  const url = await new Promise<string>((resolveUrl, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`macts --serve did not start.\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }, READY_TIMEOUT_MS)
    child.stdout.on('data', () => {
      const match = READY_LINE.exec(stdout)
      if (match?.[1] !== undefined) {
        clearTimeout(timer)
        resolveUrl(match[1])
      }
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      reject(
        new Error(
          `macts --serve exited with ${String(code)} before starting.\nstdout:\n${stdout}\nstderr:\n${stderr}`
        )
      )
    })
  })

  // The ready line is a promise that the port accepts connections. Check it
  // once, with no retry: a retry would hide a server that announces itself
  // before it is listening. On failure, report the process's own output and
  // exit status rather than leaving each test to fail with a bare refusal.
  try {
    await fetch(`${url}/health`)
  } catch (error) {
    const exit = child.exitCode ?? child.signalCode ?? 'still running'
    child.kill('SIGKILL')
    const cause = error instanceof Error ? describeFetchFailure(error) : String(error)
    throw new Error(
      `macts --serve reported ${url} but did not accept a connection (${cause}; process: ${String(exit)}).\nstdout:\n${stdout}\nstderr:\n${stderr}`
    )
  }

  return {
    url,
    stdout: () => stdout,
    stderr: () => stderr,
    stop: () => stopProcess(child),
  }
}

/** A fetch failure's message with its underlying network cause, when there is one. */
function describeFetchFailure(error: Error): string {
  const cause: unknown = error.cause
  return cause instanceof Error ? `${error.message}: ${cause.message}` : error.message
}

/** Send SIGTERM and wait for exit, escalating to SIGKILL if it does not come. */
async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  await new Promise<void>((resolveExit) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 10_000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolveExit()
    })
    child.kill('SIGTERM')
  })
}
