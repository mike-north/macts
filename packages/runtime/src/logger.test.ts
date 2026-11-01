/**
 * Tests for the process-wide logger's optional pretty transport.
 *
 * `pino-pretty` is a development convenience that published consumers do not
 * install; a logger must still be created when it cannot be resolved.
 *
 * @see https://getpino.io/#/docs/transports
 */

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
