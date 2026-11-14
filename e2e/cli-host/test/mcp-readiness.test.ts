/** Subprocess readiness must describe the owned server's actual state (issue #302). */
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import {
  CLI_BIN,
  connectMcpHttp,
  createKey,
  createMactsHome,
  freePort,
  runCli,
  startOwnedMcp,
} from '../src/harness.js'

/** Wait for a preload receipt so elapsed hold time is measured inside the actual child. */
async function awaitGate(path: string): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt++) {
    if (existsSync(path)) return
    await delay(20)
  }
  throw new Error(`Child did not enter startup gate: ${path}`)
}

/** Include the child's diagnostics on failure without retaining API key material. */
function diagnostics(home: string): string {
  const log = join(home, 'mcp.log')
  return existsSync(log)
    ? readFileSync(log, 'utf8').replace(/macts_sk_[\w-]+/g, '[REDACTED]')
    : '(no child log)'
}

/** A preload controls startup timing without adding product configuration. */
function gateEnv(home: string, deadline = false): Record<string, string> {
  return {
    MACTS_TEST_EXECUTOR: 'stub',
    MACTS_TEST_START_GATE: home,
    MACTS_TEST_SHORT_DEADLINE: deadline ? '1' : '0',
    NODE_OPTIONS: `${process.env['NODE_OPTIONS'] ?? ''} --import ${new URL('../src/mcp-start-gate.mjs', import.meta.url).href}`,
  }
}

describe('mcp start readiness (issue #302)', () => {
  it.each(['tcp', 'default socket'])(
    'waits beyond one second for %s initialization',
    async (endpoint) => {
      const home = createMactsHome()
      let owned: ReturnType<typeof startOwnedMcp> | undefined
      let session: Awaited<ReturnType<typeof connectMcpHttp>> | undefined
      try {
        const token = await createKey(home, 'notes:notes:list')
        const port = endpoint === 'tcp' ? await freePort() : undefined
        owned = startOwnedMcp(
          home,
          port === undefined ? [] : ['--port', String(port)],
          gateEnv(home.path)
        )
        let settled = false
        void owned.result.then(() => {
          settled = true
        })
        await awaitGate(join(home.path, 'entered'))
        await delay(1200)
        expect(settled, diagnostics(home.path)).toBe(false)
        expect(existsSync(join(home.path, 'mcp.pid'))).toBe(false)
        writeFileSync(join(home.path, 'release'), '')
        const result = await owned.result
        expect(result.code, `${result.stdout}\n${result.stderr}\n${diagnostics(home.path)}`).toBe(0)
        const pid = readFileSync(join(home.path, 'entered'), 'utf8')
        expect(result.stdout).toContain(`MCP server started (PID ${pid})`)
        if (port !== undefined) {
          session = await connectMcpHttp(`http://127.0.0.1:${String(port)}`, token)
          expect(
            (await session.client.listTools()).tools.some(
              (tool) => tool.name === 'macts__notes__notes_list'
            )
          ).toBe(true)
        } else {
          const status = await runCli(home, ['mcp', 'status', '--json'])
          expect(status.code, status.stdout + status.stderr).toBe(0)
          expect(JSON.parse(status.stdout)).toMatchObject({
            running: true,
            pid: Number(pid),
            health: { status: 'ok' },
          })
        }
        const help = await runCli(home, ['mcp', 'start', '--help'])
        expect(help.stdout).toContain('30 seconds')
      } finally {
        if (owned) await owned.cleanup(() => session?.close() ?? Promise.resolve())
        if (!owned || owned.exited()) home.dispose()
      }
    },
    30000
  )

  it('stops the owned child at the deadline and status agrees before external cleanup', async () => {
    const home = createMactsHome()
    const owned = startOwnedMcp(home, [], gateEnv(home.path, true))
    try {
      await awaitGate(join(home.path, 'entered'))
      const pid = Number(readFileSync(join(home.path, 'entered'), 'utf8'))
      writeFileSync(join(home.path, 'expire'), '')
      const result = await owned.result
      expect(result.code, diagnostics(home.path)).toBe(1)
      expect(result.stderr).toContain('readiness deadline of 30 seconds')
      expect(result.stderr).toContain(join(home.path, 'mcp.log'))
      expect(() => process.kill(pid, 0)).toThrow(/ESRCH/)
      writeFileSync(join(home.path, 'release'), '')
      await delay(200)
      expect(existsSync(join(home.path, 'mcp.pid'))).toBe(false)
      expect(existsSync(join(home.path, 'mcp.sock'))).toBe(false)
      const status = await runCli(home, ['mcp', 'status'])
      expect(status.code).toBe(1)
      expect(status.stdout).toContain('not running')
    } finally {
      await owned.cleanup()
      if (owned.exited()) home.dispose()
    }
  }, 30000)
})

describe('foreground IPC ownership (issue #302)', () => {
  it('keeps listening after an unrelated parent disconnects before initialization', async () => {
    const home = createMactsHome()
    const port = await freePort()
    const child = spawn(process.execPath, [CLI_BIN, 'mcp', 'serve', '--port', String(port)], {
      env: { ...process.env, ...gateEnv(home.path), MACTS_HOME: home.path },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    })
    let stderr = ''
    const exited = once(child, 'exit')
    try {
      if (child.stdout === null || child.stderr === null) {
        throw new Error('Foreground fixture requires piped output streams')
      }
      child.stdout.resume()
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      await awaitGate(join(home.path, 'entered'))
      child.disconnect()
      await awaitGate(join(home.path, 'disconnected'))
      writeFileSync(join(home.path, 'release'), '')
      for (let attempt = 0; attempt < 500; attempt++) {
        if (stderr.includes('MCP server running at') || child.exitCode !== null) break
        await delay(20)
      }
      expect(stderr).toContain('MCP server running at')
      // Allow a failed readiness callback to run before checking sustained listening.
      await delay(300)
      expect(child.exitCode, stderr).toBeNull()
      expect(child.signalCode, stderr).toBeNull()
      expect((await fetch(`http://127.0.0.1:${String(port)}/health`)).status).toBe(200)
      child.kill('SIGTERM')
      expect(await exited).toEqual([0, null])
      expect(() => process.kill(Number(child.pid), 0)).toThrow(/ESRCH/)
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const escalation = setTimeout(() => child.kill('SIGKILL'), 2000)
        child.kill('SIGTERM')
        try {
          await exited
        } finally {
          clearTimeout(escalation)
        }
      } else await exited
      home.dispose()
    }
  }, 30000)
})
