/**
 * Test helpers for MCP command tests.
 *
 * @packageDocumentation
 */

import { Writable } from 'node:stream'

/**
 * Mock stdout/stderr streams for testing.
 */
export interface MockStreams {
  stdout: Writable
  stderr: Writable
  getStdout: () => string
  getStderr: () => string
}

/**
 * Create mock streams for capturing command output.
 */
export function createMockStreams(): MockStreams {
  let stdoutOutput = ''
  let stderrOutput = ''

  const stdout = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      stdoutOutput += chunk.toString()
      callback()
    },
  })

  const stderr = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      stderrOutput += chunk.toString()
      callback()
    },
  })

  return {
    stdout,
    stderr,
    getStdout: () => stdoutOutput,
    getStderr: () => stderrOutput,
  }
}
