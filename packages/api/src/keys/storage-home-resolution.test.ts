/**
 * Regression tests for key/secret storage directory resolution.
 *
 * Guards issue #44: storage previously computed its directory as
 * `path.join(process.env['HOME'] ?? '~', '.macts')`, which:
 *   1. ignored `MACTS_HOME` (split-brain with plugins/paths), and
 *   2. produced a cwd-relative `./~/.macts` when `HOME` was unset, writing the
 *      JWT signing secret (mode 0o600) and `api-keys.db` wherever the process
 *      happened to run.
 *
 * `MACTS_DIR` in storage.ts is resolved at module-load time, so each scenario
 * sets the environment and then re-imports the module via `vi.resetModules()`.
 *
 * @see https://nodejs.org/api/os.html#oshomedir os.homedir() semantics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

let originalHome: string | undefined
let originalMactsHome: string | undefined
let originalEnvSecret: string | undefined
const tempDirs: string[] = []

/** Load a fresh copy of the storage module under the current environment. */
async function loadStorage(): Promise<typeof import('./storage.js')> {
  vi.resetModules()
  return import('./storage.js')
}

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-home-resolution-'))
  tempDirs.push(dir)
  return dir
}

beforeEach(() => {
  originalHome = process.env['HOME']
  originalMactsHome = process.env['MACTS_HOME']
  originalEnvSecret = process.env['MACTS_API_KEY_SECRET']
  // A secret from the env would short-circuit file writes; ensure file path.
  delete process.env['MACTS_API_KEY_SECRET']
})

afterEach(() => {
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
  if (originalEnvSecret === undefined) {
    delete process.env['MACTS_API_KEY_SECRET']
  } else {
    process.env['MACTS_API_KEY_SECRET'] = originalEnvSecret
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors.
      }
    }
  }
})

describe('storage directory resolution (issue #44)', () => {
  it('resolves under MACTS_HOME when HOME is unset', async () => {
    // Acceptance: HOME unset + MACTS_HOME set => resolves under MACTS_HOME.
    const mactsHome = makeTempDir()
    delete process.env['HOME']
    process.env['MACTS_HOME'] = mactsHome

    const storage = await loadStorage()
    try {
      await storage.getSigningSecret()

      const secretFile = path.join(mactsHome, 'secrets', 'api-key-secret')
      expect(fs.existsSync(secretFile)).toBe(true)
      // The resolved location is absolute, not cwd-relative.
      expect(path.isAbsolute(secretFile)).toBe(true)
      expect(secretFile.startsWith(process.cwd())).toBe(false)
    } finally {
      storage.closeDatabase()
    }
  })

  it('honors MACTS_HOME over HOME (no split-brain)', async () => {
    // Plugins and secrets must agree: both resolve from MACTS_HOME when set.
    const homeDir = makeTempDir()
    const mactsHome = makeTempDir()
    process.env['HOME'] = homeDir
    process.env['MACTS_HOME'] = mactsHome

    const storage = await loadStorage()
    try {
      await storage.getSigningSecret()
      storage.loadKeyMetadata() // forces DB creation

      expect(fs.existsSync(path.join(mactsHome, 'api-keys.db'))).toBe(true)
      // Nothing must leak into HOME/.macts.
      expect(fs.existsSync(path.join(homeDir, '.macts'))).toBe(false)
    } finally {
      storage.closeDatabase()
    }
  })

  it('falls back to os.homedir()/.macts when MACTS_HOME is unset', async () => {
    // Acceptance: MACTS_HOME unset => os.homedir() fallback. Point HOME at a
    // temp dir so os.homedir() (which reads HOME on POSIX) is sandboxed.
    const homeDir = makeTempDir()
    delete process.env['MACTS_HOME']
    process.env['HOME'] = homeDir

    const storage = await loadStorage()
    try {
      await storage.getSigningSecret()

      const expectedDir = path.join(os.homedir(), '.macts')
      const secretFile = path.join(expectedDir, 'secrets', 'api-key-secret')
      expect(fs.existsSync(secretFile)).toBe(true)
    } finally {
      storage.closeDatabase()
    }
  })

  it('never writes secrets to a cwd-relative ./~/.macts when HOME is unset', async () => {
    // Core regression: HOME unset must not produce ./~/.macts in cwd.
    const homeDir = makeTempDir()
    delete process.env['HOME']
    // Without MACTS_HOME, os.homedir() is used. Provide a sandbox via MACTS_HOME
    // so the test does not touch the real home directory, while still asserting
    // the literal-tilde path is never created.
    process.env['MACTS_HOME'] = homeDir

    const storage = await loadStorage()
    try {
      await storage.getSigningSecret()
      storage.loadKeyMetadata()

      // The defective path. It must never exist.
      const tildeDir = path.join(process.cwd(), '~', '.macts')
      expect(fs.existsSync(tildeDir)).toBe(false)
      // And there must be no literal "~" entry created in cwd.
      expect(fs.existsSync(path.join(process.cwd(), '~'))).toBe(false)
    } finally {
      storage.closeDatabase()
    }
  })

  it('preserves 0o700 dir and 0o600 secret-file permissions under MACTS_HOME', async () => {
    // Security: secret material must keep restrictive permissions regardless of
    // how the directory was resolved.
    const mactsHome = makeTempDir()
    delete process.env['HOME']
    process.env['MACTS_HOME'] = mactsHome

    const storage = await loadStorage()
    try {
      await storage.getSigningSecret()

      const secretsDir = path.join(mactsHome, 'secrets')
      const secretFile = path.join(secretsDir, 'api-key-secret')

      expect(fs.statSync(secretsDir).mode & 0o777).toBe(0o700)
      expect(fs.statSync(secretFile).mode & 0o777).toBe(0o600)
    } finally {
      storage.closeDatabase()
    }
  })
})
