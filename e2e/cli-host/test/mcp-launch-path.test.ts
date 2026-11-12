/** The packaged CLI must locate its own binary when starting the daemon. */
import { describe, expect, it } from 'vitest'
import { createMactsHome, startOwnedMcp } from '../src/harness.js'

describe('mcp start bundled binary path', () => {
  it('finds the built binary beside the bundled launcher', async () => {
    const home = createMactsHome()
    const owned = startOwnedMcp(home, [], { MACTS_TEST_EXECUTOR: 'invalid' })
    try {
      // An invalid test executor makes the child exit before it starts a server.
      const result = await owned.result
      expect(result.code).toBe(1)
      expect(result.stderr).toContain('Failed to start MCP server')
      expect(result.stderr).not.toContain('Cannot find macts binary')
    } finally {
      await owned.cleanup()
      if (owned.exited()) home.dispose()
    }
  }, 30000)
})
