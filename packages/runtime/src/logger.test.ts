/**
 * Tests for the process-wide logger's optional pretty transport.
 *
 * `pino-pretty` is a development convenience that published consumers do not
 * install; a logger must still be created when it cannot be resolved.
 *
 * @see https://getpino.io/#/docs/transports
 * @see https://getpino.io/#/docs/api?id=pino-destination
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isPrettyTransportAvailable } from './logger.js'

describe('isPrettyTransportAvailable', () => {
  it('is false when pino-pretty cannot be resolved', () => {
    const missing = (specifier: string): string => {
      throw Object.assign(new Error(`Cannot find module '${specifier}'`), {
        code: 'MODULE_NOT_FOUND',
      })
    }
    expect(isPrettyTransportAvailable(missing)).toBe(false)
  })

  it('is true when pino-pretty resolves', () => {
    expect(isPrettyTransportAvailable(() => '/somewhere/pino-pretty/index.js')).toBe(true)
  })

  it('resolves the real pino-pretty in this workspace, where it is a dev dependency', () => {
    expect(isPrettyTransportAvailable()).toBe(true)
  })
})

/**
 * Where a logger's lines land, observed from a separate process: Pino writes
 * through file descriptors, which an in-process spy on `process.stdout` would
 * not see. The child imports this package's build output (the `test` target
 * depends on `build`). Both the plain JSON stream and the pretty transport are
 * covered, because a host whose stdout is a protocol channel needs both
 * redirected.
 */
describe('createLogger destination', () => {
  const packageRoot = fileURLToPath(new URL('..', import.meta.url))

  /** Run one log call in a child process and capture both streams. */
  function logFromChild(destination: string, nodeEnv: string): { stdout: string; stderr: string } {
    const script = [
      `import { createLogger } from './dist/index.js'`,
      `const log = createLogger({}, ${JSON.stringify(destination)})`,
      `log.info('destination-probe')`,
      `log.flush?.()`,
    ].join('\n')
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: packageRoot,
      encoding: 'utf-8',
      env: { PATH: process.env['PATH'] ?? '', NODE_ENV: nodeEnv, NO_COLOR: '1' },
      timeout: 30_000,
    })
    if (result.status !== 0) {
      throw new Error(`child failed (${String(result.status)}): ${result.stderr}`)
    }
    return { stdout: result.stdout, stderr: result.stderr }
  }

  it.each(['production', 'development'])(
    'writes only to stderr when asked to, with NODE_ENV=%s',
    (nodeEnv) => {
      const { stdout, stderr } = logFromChild('stderr', nodeEnv)
      expect(stdout).toBe('')
      expect(stderr).toContain('destination-probe')
    }
  )

  it.each(['production', 'development'])(
    'writes to stdout by default, with NODE_ENV=%s',
    (nodeEnv) => {
      const { stdout, stderr } = logFromChild('stdout', nodeEnv)
      expect(stdout).toContain('destination-probe')
      expect(stderr).not.toContain('destination-probe')
    }
  )
})
