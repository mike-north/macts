/**
 * Harness for subprocess UATs of the `macts` host commands.
 *
 * Each test gets a fresh macts home whose plugins directory has real, built
 * app packages linked into `plugins/node_modules/@macts`, the way
 * `macts mcp install <app>` lays out a hoisted install: by default the two app
 * pairs in {@link INSTALLED_APPS} (`@macts/<app>-server` and `@macts/<app>`),
 * or every `@macts/<app>-server` package in the workspace with its app
 * package. The built CLI runs as a child process under a minimal
 * environment (no inherited `MACTS_*` variables, and `HOME` pointing into the
 * temporary directory), so nothing reads or writes the real `~/.macts`.
 */

import {
  execFile,
  spawn,
  type ChildProcess,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ReadBuffer, serializeMessage } from '@modelcontextprotocol/sdk/shared/stdio.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  CallToolResultSchema,
  type CallToolResult,
  type JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js'

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

/** The apps whose server and app packages a default macts home has installed, sorted. */
export const INSTALLED_APPS = ['notes', 'reminders'] as const

/** The repository root's shipped user docs, for checks on what they mention. */
export const SHIPPED_READMES = [
  join(REPO_ROOT, 'README.md'),
  join(REPO_ROOT, 'packages', 'cli', 'README.md'),
] as const

/** A temporary macts home with apps installed; dispose it after the test. */
export interface MactsHome {
  /** The directory `MACTS_HOME` points at. */
  readonly path: string
  /** The apps whose packages are installed, sorted. */
  readonly apps: readonly string[]
  /** Remove the directory. */
  dispose(): void
}

/** The workspace's packages directory. */
const WORKSPACE_PACKAGES = join(REPO_ROOT, 'packages')

/**
 * Every app with a host package in the workspace, sorted: each
 * `packages/<app>-server` directory.
 */
export function workspaceServerApps(): string[] {
  return readdirSync(WORKSPACE_PACKAGES)
    .filter((entry) => entry.endsWith('-server'))
    .map((entry) => entry.slice(0, -'-server'.length))
    .sort()
}

/** Which apps a macts home installs. */
export type InstalledAppSet = 'default' | 'all-workspace-apps'

/**
 * Create a macts home whose plugins directory holds built app packages.
 *
 * @param apps - `default` links the packages of {@link INSTALLED_APPS}
 *   through this package's dependencies; `all-workspace-apps`
 *   links every workspace `@macts/<app>-server` package and its
 *   `@macts/<app>` package, from the host package's own dependencies.
 */
export function createMactsHome(apps: InstalledAppSet = 'default'): MactsHome {
  const root = mkdtempSync(join(tmpdir(), 'macts-cli-host-'))
  const path = join(root, 'macts-home')
  const plugins = join(path, 'plugins')
  const scope = join(plugins, 'node_modules', '@macts')
  mkdirSync(scope, { recursive: true })

  const installed: readonly string[] = apps === 'default' ? INSTALLED_APPS : workspaceServerApps()
  writeFileSync(
    join(plugins, 'package.json'),
    JSON.stringify({
      name: 'macts-plugins',
      version: '1.0.0',
      private: true,
      dependencies: Object.fromEntries(installed.map((app) => [`@macts/${app}-server`, '*'])),
    })
  )
  for (const app of installed) {
    const hostDir =
      apps === 'default'
        ? dependencyDir(`@macts/${app}-server`)
        : join(WORKSPACE_PACKAGES, `${app}-server`)
    const appDir =
      apps === 'default'
        ? dependencyDir(`@macts/${app}`)
        : realpathSync(join(hostDir, 'node_modules', '@macts', app))
    if (!existsSync(join(hostDir, 'dist'))) {
      throw new Error(`@macts/${app}-server is not built; run the build first`)
    }
    symlinkSync(hostDir, join(scope, `${app}-server`), 'dir')
    symlinkSync(appDir, join(scope, app), 'dir')
  }
  return {
    path,
    apps: installed,
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
function minimalEnv(
  home: MactsHome,
  extra: Readonly<Record<string, string>>
): Record<string, string> {
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

/** Write `<macts home>/governance/policy.json` with exactly `contents`. */
export function writePolicyFile(home: MactsHome, contents: string): void {
  const dir = join(home.path, 'governance')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'policy.json'), contents)
}

/**
 * `StreamableHTTPClientTransport` declares `sessionId`/`onclose`/`onerror` as
 * accessor pairs typed to allow `undefined`, where `Transport` declares plain
 * optional fields. Under `exactOptionalPropertyTypes` the two are
 * structurally incompatible although the class implements `Transport` at
 * runtime; this is an upstream SDK typing gap.
 */
function asTransport(transport: StreamableHTTPClientTransport): Transport {
  return transport as unknown as Transport
}

/** A connected MCP client, and the server process's stderr so far. */
export interface McpSession {
  readonly client: Client
  /** Everything the server wrote to stderr so far (stdio sessions only). */
  stderr(): string
  /** Disconnect, stopping the server process for a stdio session. */
  close(): Promise<void>
}

/**
 * Start the built `macts --mcp` as an MCP client would, over stdio, and
 * connect a real MCP client to it.
 *
 * @param home - The macts home the server runs in.
 * @param extraEnv - Added to the minimal environment, e.g. `MACTS_API_KEY`.
 */
export async function connectMcpStdio(
  home: MactsHome,
  extraEnv: Readonly<Record<string, string>> = {}
): Promise<McpSession> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [CLI_BIN, '--mcp'],
    cwd: REPO_ROOT,
    env: minimalEnv(home, extraEnv),
    stderr: 'pipe',
  })
  let stderr = ''
  transport.stderr?.on('data', (chunk: Buffer | string) => (stderr += chunk.toString()))
  const client = new Client({ name: 'cli-host-uat', version: '1.0.0' })
  try {
    await client.connect(transport)
  } catch (error) {
    throw new Error(`macts --mcp did not start: ${String(error)}\nstderr:\n${stderr}`)
  }
  return { client, stderr: () => stderr, close: () => client.close() }
}

/** A stdio MCP session that also exposes everything the server wrote to stdout. */
export interface RawMcpStdioSession extends McpSession {
  /** Every byte the server wrote to stdout so far, decoded as UTF-8. */
  stdout(): string
}

/**
 * An MCP client transport over a child process's stdin and stdout that hands
 * every raw stdout chunk to an observer before decoding it.
 *
 * The SDK's `StdioClientTransport` owns its child's stdout and exposes only the
 * decoded messages, so a test of what the server writes to stdout, protocol
 * frames or anything else, needs its own view of the stream. Framing and
 * decoding use the SDK's own `ReadBuffer` and `serializeMessage`, so the
 * client sees exactly what `StdioClientTransport` would give it. A line that
 * is not a JSON-RPC message is reported through `onerror`, not dropped
 * silently.
 */
class ObservedStdioTransport implements Transport {
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  readonly #child: ChildProcessWithoutNullStreams
  readonly #observe: (chunk: string) => void
  readonly #buffer = new ReadBuffer()

  constructor(child: ChildProcessWithoutNullStreams, observe: (chunk: string) => void) {
    this.#child = child
    this.#observe = observe
  }

  start(): Promise<void> {
    this.#child.stdout.on('data', (chunk: Buffer) => {
      this.#observe(chunk.toString('utf8'))
      this.#buffer.append(chunk)
      this.#drain()
    })
    this.#child.on('error', (error) => this.onerror?.(error))
    this.#child.on('close', () => this.onclose?.())
    return Promise.resolve()
  }

  send(message: JSONRPCMessage): Promise<void> {
    return new Promise((resolveSend) => {
      if (this.#child.stdin.write(serializeMessage(message))) resolveSend()
      else this.#child.stdin.once('drain', resolveSend)
    })
  }

  close(): Promise<void> {
    if (this.#child.exitCode !== null || this.#child.signalCode !== null) return Promise.resolve()
    return new Promise((resolveClose) => {
      this.#child.once('close', () => {
        resolveClose()
      })
      this.#child.kill()
    })
  }

  /** Deliver every complete line in the buffer. */
  #drain(): void {
    for (;;) {
      let message: JSONRPCMessage | null
      try {
        message = this.#buffer.readMessage()
      } catch (error) {
        this.onerror?.(error instanceof Error ? error : new Error(String(error)))
        continue
      }
      if (message === null) return
      this.onmessage?.(message)
    }
  }
}

/**
 * Start the built `macts --mcp` as {@link connectMcpStdio} does, but over a
 * transport that records the server's raw stdout, so a test can check that
 * nothing but protocol frames reaches it.
 */
export async function connectMcpStdioRaw(
  home: MactsHome,
  extraEnv: Readonly<Record<string, string>> = {}
): Promise<RawMcpStdioSession> {
  const child = spawn(process.execPath, [CLI_BIN, '--mcp'], {
    cwd: REPO_ROOT,
    env: minimalEnv(home, extraEnv),
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')))
  const transport = new ObservedStdioTransport(child, (chunk) => (stdout += chunk))
  const client = new Client({ name: 'cli-host-uat-raw', version: '1.0.0' })
  try {
    await client.connect(transport)
  } catch (error) {
    await transport.close()
    throw new Error(`macts --mcp did not start: ${String(error)}\nstderr:\n${stderr}`)
  }
  return {
    client,
    stdout: () => stdout,
    stderr: () => stderr,
    close: () => client.close(),
  }
}

/**
 * Connect a real MCP client to a running daemon over Streamable HTTP,
 * presenting `token` as the bearer on every request.
 */
export async function connectMcpHttp(url: string, token: string): Promise<McpSession> {
  const transport = new StreamableHTTPClientTransport(new URL(`${url}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  })
  const client = new Client({ name: 'cli-host-uat-http', version: '1.0.0' })
  await client.connect(asTransport(transport))
  return { client, stderr: () => '', close: () => client.close() }
}

/** Call a tool and return its result, validated as a tool result. */
export async function callTool(
  session: McpSession,
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  return CallToolResultSchema.parse(await session.client.callTool({ name, arguments: args }))
}

/** The JSON document in a tool result's only text content. */
export function toolDocument(result: CallToolResult): unknown {
  const [first, ...rest] = result.content
  if (first?.type !== 'text' || rest.length > 0) {
    throw new Error(`Expected exactly one text content item, got ${JSON.stringify(result)}`)
  }
  return JSON.parse(first.text)
}

/** A running `macts mcp serve` daemon. */
export interface McpDaemonProcess {
  /** The daemon's base URL. */
  readonly url: string
  /** Everything written to stderr so far. */
  stderr(): string
  /** Stop the daemon and wait for the process to exit. */
  stop(): Promise<void>
}

/** The line `macts mcp serve` prints once it is listening. */
const DAEMON_READY_LINE = /MCP server running at (\S+)/

/**
 * Start `macts mcp serve --port <port>` and resolve once it reports that it
 * is listening. Rejects with its output if it exits first.
 */
export async function startMcpDaemon(
  home: MactsHome,
  port: number,
  extraEnv: Readonly<Record<string, string>> = {}
): Promise<McpDaemonProcess> {
  const child = spawn(process.execPath, [CLI_BIN, 'mcp', 'serve', '--port', String(port)], {
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
      reject(new Error(`macts mcp serve did not start.\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }, READY_TIMEOUT_MS)
    child.stderr.on('data', () => {
      const match = DAEMON_READY_LINE.exec(stderr)
      if (match?.[1] !== undefined) {
        clearTimeout(timer)
        resolveUrl(match[1])
      }
    })
    child.once('exit', (code) => {
      clearTimeout(timer)
      reject(
        new Error(
          `macts mcp serve exited with ${String(code)} before starting.\nstdout:\n${stdout}\nstderr:\n${stderr}`
        )
      )
    })
  })

  return { url, stderr: () => stderr, stop: () => stopProcess(child) }
}
