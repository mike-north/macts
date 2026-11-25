/** Publication failures retain their cause while cleanup failures remain visible. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const faults = vi.hoisted(() => ({
  write: false,
  close: false,
  unlink: false,
  writeError: new Error('candidate write failed'),
  closeError: new Error('candidate close failed'),
  unlinkError: new Error('candidate unlink failed'),
}))

vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args)
      const close = handle.close.bind(handle)
      if (faults.write) handle.writeFile = () => Promise.reject(faults.writeError)
      if (faults.close) {
        handle.close = async () => {
          await close()
          throw faults.closeError
        }
      }
      return handle
    },
    unlink: (file: string) =>
      faults.unlink ? Promise.reject(faults.unlinkError) : actual.unlink(file),
  }
})

vi.mock('node:fs', async (original) => {
  const actual = await original<typeof import('node:fs')>()
  return {
    ...actual,
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) => {
      if (faults.write && typeof args[0] === 'number') throw faults.writeError
      actual.writeFileSync(...args)
    },
    closeSync: (fd: number) => {
      actual.closeSync(fd)
      if (faults.close) throw faults.closeError
    },
    unlinkSync: (file: string) => {
      if (faults.unlink) throw faults.unlinkError
      actual.unlinkSync(file)
    },
  }
})

describe.each(['async', 'sync'] as const)('%s secret cleanup', (mode) => {
  let home: string
  let previousHome: string | undefined
  let previousSecret: string | undefined
  let storage: typeof import('./storage.js')
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-cleanup-'))
    previousHome = process.env['MACTS_HOME']
    previousSecret = process.env['MACTS_API_KEY_SECRET']
    process.env['MACTS_HOME'] = home
    delete process.env['MACTS_API_KEY_SECRET']
    faults.write = faults.close = faults.unlink = false
    warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => {
      /* Keep expected warnings in the spy. */
    })
    vi.resetModules()
    storage = await import('./storage.js')
  })
  afterEach(() => {
    faults.write = faults.close = faults.unlink = false
    storage.closeKeyStore()
    vi.restoreAllMocks()
    if (previousHome === undefined) delete process.env['MACTS_HOME']
    else process.env['MACTS_HOME'] = previousHome
    if (previousSecret === undefined) delete process.env['MACTS_API_KEY_SECRET']
    else process.env['MACTS_API_KEY_SECRET'] = previousSecret
    fs.rmSync(home, { recursive: true, force: true })
  })

  /** Exercise the synchronous encryption entry point or the async secret accessor. */
  async function useSecret(): Promise<string> {
    if (mode === 'async') {
      return storage.getSigningSecret()
    } else {
      storage.addKeyMetadata({
        id: 'key_test',
        name: 'test',
        permissions: [],
        originalPermissions: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        revoked: false,
        keyPrefix: 'test',
      })
      return storage.getSigningSecret()
    }
  }

  /** Warnings identify the actual candidate and the failed cleanup operation. */
  function expectWarning(error: Error): void {
    const candidates = fs
      .readdirSync(path.join(home, 'secrets'))
      .filter((name) => name.startsWith('.api-key-secret-'))
    expect(candidates).toHaveLength(1)
    const diagnostic = warn.mock.calls.map((args) => String(args[0])).join('\n')
    expect(diagnostic).toContain(path.join(home, 'secrets', candidates[0] ?? ''))
    expect(diagnostic).toContain(error.message)
  }

  it('preserves the write error when closing also fails', async () => {
    faults.write = faults.close = true
    await expect(useSecret()).rejects.toBe(faults.writeError)
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0])).toContain(faults.closeError.message)
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      path.join(home, 'secrets', '.api-key-secret-')
    )
    expect(fs.readdirSync(path.join(home, 'secrets'))).toEqual([])
  })
  it('preserves the write error and reports an unlink failure', async () => {
    faults.write = faults.unlink = true
    await expect(useSecret()).rejects.toBe(faults.writeError)
    expectWarning(faults.unlinkError)
  })
  it('returns successfully after publication when unlink fails', async () => {
    faults.unlink = true
    const secret = await useSecret()
    const secretPath = path.join(home, 'secrets', 'api-key-secret')
    expect(fs.existsSync(secretPath)).toBe(true)
    expect(secret === fs.readFileSync(secretPath, 'utf8').trim()).toBe(true)
    expectWarning(faults.unlinkError)
  })
  it('reports a close failure as the operation error and removes the candidate', async () => {
    faults.close = true
    await expect(useSecret()).rejects.toBe(faults.closeError)
    expect(fs.readdirSync(path.join(home, 'secrets'))).toEqual([])
  })
})
