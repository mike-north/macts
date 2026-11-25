/** Tests for publication and validation of the key store's shared secret. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const faults = vi.hoisted(() => ({ lose: false, failWrite: false }))
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return {
    ...actual,
    link: async (source: string, target: string) => {
      if (faults.lose) {
        await actual.writeFile(target, 'winner-secret', { mode: 0o600 })
      }
      return actual.link(source, target)
    },
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args)
      if (faults.failWrite) {
        handle.writeFile = () => Promise.reject(new Error('injected write failure'))
      }
      return handle
    },
  }
})

describe('signing secret publication', () => {
  let home: string
  let oldHome: string | undefined
  let oldSecret: string | undefined
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-secret-'))
    oldHome = process.env['MACTS_HOME']
    oldSecret = process.env['MACTS_API_KEY_SECRET']
    process.env['MACTS_HOME'] = home
    delete process.env['MACTS_API_KEY_SECRET']
    faults.lose = false
    faults.failWrite = false
    vi.resetModules()
  })
  afterEach(() => {
    if (oldHome === undefined) delete process.env['MACTS_HOME']
    else process.env['MACTS_HOME'] = oldHome
    if (oldSecret === undefined) delete process.env['MACTS_API_KEY_SECRET']
    else process.env['MACTS_API_KEY_SECRET'] = oldSecret
    fs.rmSync(home, { recursive: true, force: true })
  })
  it('uses the winner and removes its temporary file when publication loses', async () => {
    faults.lose = true
    const storage = await import('./storage.js')
    expect((await storage.getSigningSecret()) === 'winner-secret').toBe(true)
    expect(fs.readdirSync(path.join(home, 'secrets'))).toEqual(['api-key-secret'])
  })
  it.each(['', ' \n\t'])('rejects an empty existing secret', async (contents) => {
    const dir = path.join(home, 'secrets')
    fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir, 'api-key-secret'), contents)
    const storage = await import('./storage.js')
    await expect(storage.getSigningSecret()).rejects.toThrow(/empty/i)
    expect(fs.readFileSync(path.join(dir, 'api-key-secret'), 'utf8')).toBe(contents)
  })
  it('refuses an empty secret when metadata encryption is used first', async () => {
    const dir = path.join(home, 'secrets')
    fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir, 'api-key-secret'), '  ')
    const storage = await import('./storage.js')
    expect(() => {
      storage.addKeyMetadata({
        id: 'key_test',
        name: 'test',
        permissions: [],
        originalPermissions: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        revoked: false,
        keyPrefix: 'test',
      })
    }).toThrow(/empty/i)
    storage.closeKeyStore()
  })
  it('removes the temporary file when writing fails', async () => {
    faults.failWrite = true
    const storage = await import('./storage.js')
    let failure: unknown
    try {
      await storage.getSigningSecret()
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('injected write failure')
    expect(fs.readdirSync(path.join(home, 'secrets'))).toEqual([])
  })
})
