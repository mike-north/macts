/**
 * Unit tests for macts path resolution.
 *
 * Regression coverage for the security defect where key/secret storage
 * resolved its directory via `process.env['HOME'] ?? '~'`, ignoring
 * `MACTS_HOME` and producing a cwd-relative `./~/.macts` when `HOME` was unset
 * (cron, containers, CI). See issue #44.
 *
 * @see https://nodejs.org/api/os.html#oshomedir os.homedir() semantics
 * @see https://nodejs.org/api/path.html#pathisabsolutepath path.isAbsolute()
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as os from 'node:os'
import * as path from 'node:path'
import { getMactsHome } from './paths.js'

describe('getMactsHome', () => {
  let originalHome: string | undefined
  let originalMactsHome: string | undefined

  beforeEach(() => {
    originalHome = process.env['HOME']
    originalMactsHome = process.env['MACTS_HOME']
  })

  afterEach(() => {
    // Restore environment so tests do not leak state into each other.
    if (originalHome === undefined) {
      delete process.env['HOME']
    } else {
      process.env['HOME'] = originalHome
    }
    if (originalMactsHome === undefined) {
      delete process.env['MACTS_HOME']
    } else {
      process.env['MACTS_HOME'] = originalMactsHome
    }
  })

  it('resolves under MACTS_HOME when set, ignoring HOME', () => {
    // Acceptance criterion: storage resolves from MACTS_HOME first.
    delete process.env['HOME']
    process.env['MACTS_HOME'] = '/custom/macts/home'

    expect(getMactsHome()).toBe('/custom/macts/home')
  })

  it('honors MACTS_HOME even when HOME is also set (no split-brain)', () => {
    // The defect caused plugins to live under MACTS_HOME while secrets lived
    // under HOME; both must agree on MACTS_HOME when it is set.
    process.env['HOME'] = '/Users/someone'
    process.env['MACTS_HOME'] = '/custom/macts/home'

    expect(getMactsHome()).toBe('/custom/macts/home')
  })

  it('falls back to os.homedir()/.macts when MACTS_HOME is unset', () => {
    // Acceptance criterion: falls back to os.homedir(), consistent with
    // plugins/paths.
    delete process.env['MACTS_HOME']
    process.env['HOME'] = '/Users/someone'

    expect(getMactsHome()).toBe(path.join(os.homedir(), '.macts'))
  })

  it('never yields a cwd-relative path when HOME is unset', () => {
    // Core regression: HOME unset must NOT produce ./~/.macts.
    delete process.env['HOME']
    delete process.env['MACTS_HOME']

    const resolved = getMactsHome()

    expect(path.isAbsolute(resolved)).toBe(true)
    // os.homedir() is platform-correct and absolute even when HOME is unset.
    expect(resolved).toBe(path.join(os.homedir(), '.macts'))
  })

  it('never produces the literal "~" segment', () => {
    // Negative: the old `?? '~'` fallback injected a literal tilde segment that
    // path.join treats as a relative directory name.
    delete process.env['HOME']
    delete process.env['MACTS_HOME']

    const resolved = getMactsHome()

    expect(resolved.split(path.sep)).not.toContain('~')
    expect(resolved.startsWith('~')).toBe(false)
  })

  it('produces an absolute path regardless of cwd when MACTS_HOME is unset', () => {
    // Negative: the resolved path must not depend on process.cwd(), which the
    // cwd-relative `./~/.macts` defect did.
    delete process.env['HOME']
    delete process.env['MACTS_HOME']

    const resolved = getMactsHome()

    expect(resolved.startsWith(process.cwd())).toBe(false)
    expect(path.isAbsolute(resolved)).toBe(true)
  })
})
