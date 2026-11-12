/** Background MCP diagnostics remain available without exposing the bearer. */
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  callTool,
  connectMcpHttp,
  createKey,
  createMactsHome,
  freePort,
  runCli,
  startOwnedMcp,
  writePolicyFile,
} from '../src/harness.js'

describe('macts mcp start log (issue #186)', () => {
  it('creates a missing home and log before starting the child', async () => {
    const fixture = createMactsHome()
    const home = { ...fixture, path: join(fixture.path, 'new', 'home') }
    const owned = startOwnedMcp(home, [], { MACTS_TEST_EXECUTOR: 'invalid' })
    try {
      const result = await owned.result
      expect(result.code).toBe(1)
      expect(existsSync(join(home.path, 'mcp.log'))).toBe(true)
    } finally {
      await owned.cleanup()
      if (owned.exited()) fixture.dispose()
    }
  }, 30000)

  it('appends the startup report and denied call diagnostic without the token', async () => {
    const home = createMactsHome()
    const log = join(home.path, 'mcp.log')
    const guard = {
      NODE_OPTIONS: process.env['NODE_OPTIONS'] ?? '',
      MACTS_NONNATIVE_BLOCK_LOG: process.env['MACTS_NONNATIVE_BLOCK_LOG'] ?? '',
      MACTS_TEST_EXECUTOR: 'stub',
    }
    let session: Awaited<ReturnType<typeof connectMcpHttp>> | undefined
    let owned: ReturnType<typeof startOwnedMcp> | undefined
    try {
      const token = await createKey(home, 'notes:notes:list')
      writePolicyFile(home, '{ malformed')
      writeFileSync(log, 'previous log\n')
      const port = await freePort()
      owned = startOwnedMcp(home, ['--port', String(port)], guard)
      const started = await owned.result
      expect(started.code, `${started.stdout} ${started.stderr}`).toBe(0)
      session = await connectMcpHttp(`http://127.0.0.1:${String(port)}`, token)
      expect((await callTool(session, 'macts__notes__notes_list', {})).isError).toBe(true)
      let content = readFileSync(log, 'utf8')
      for (
        let i = 0;
        i < 100 && !content.includes('Could not load the governance context; denying the call');
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        content = readFileSync(log, 'utf8')
      }
      expect(content).toContain('previous log\n')
      expect(content).toContain('Serving 2 app(s):')
      expect(content).toContain('Executor: test-stub')
      expect(content).toContain('Could not load the governance context; denying the call')
      expect(content).not.toContain(token)
      const help = await runCli(home, ['mcp', 'start', '--help'], guard)
      expect(help.stdout).toContain('MACTS_HOME')
      const status = await runCli(home, ['mcp', 'status', '--json'], guard)
      expect(status.stdout).toContain(log)
      const diagnose = await runCli(home, ['mcp', 'diagnose'], guard)
      expect(diagnose.stdout).toContain(log)
    } finally {
      try {
        if (owned) await owned.cleanup(() => session?.close() ?? Promise.resolve())
      } finally {
        // Keep the home for investigation unless the detached process is confirmed gone.
        if (!owned || owned.exited()) home.dispose()
      }
    }
  }, 90000)
})
