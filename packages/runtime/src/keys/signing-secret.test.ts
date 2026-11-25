/** Tests for publication and validation of the key store's shared secret. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const faults = vi.hoisted(() => ({
  lose: false,
  failWrite: false,
  operation: '' as string,
  error: new Error('injected failure'),
  failCleanup: false,
}))
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
      if (faults.operation === 'open') throw faults.error
      const handle = await actual.open(...args)
      if (faults.failWrite) {
        handle.writeFile = () => Promise.reject(new Error('injected write failure'))
      }
      if (faults.operation === 'write') handle.writeFile = () => Promise.reject(faults.error)
      if (faults.operation === 'sync') handle.sync = () => Promise.reject(faults.error)
      if (faults.operation === 'close') {
        const close = handle.close.bind(handle)
        handle.close = async () => {
          await close()
          throw faults.error
        }
      }
      return handle
    },
    rename: async (...args: Parameters<typeof actual.rename>) => {
      if (faults.operation === 'rename') throw faults.error
      return actual.rename(...args)
    },
    unlink: async (...args: Parameters<typeof actual.unlink>) => {
      if (faults.failCleanup) throw new Error('injected cleanup failure')
      return actual.unlink(...args)
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
    faults.operation = ''
    faults.failCleanup = false
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
  it('refuses a blank replacement without changing the stored secret', async () => {
    const storage = await import('./storage.js')
    const before = await storage.getSigningSecret()
    await expect(storage.setSigningSecret(' \n')).rejects.toThrow(/empty/i)
    expect((await storage.getSigningSecret()) === before).toBe(true)
  })
  it.each(['removed', 'blank'])('fails closed when a cached file becomes %s', async (state) => {
    const storage = await import('./storage.js')
    await storage.getSigningSecret()
    const file = path.join(home, 'secrets', 'api-key-secret')
    if (state === 'removed') fs.unlinkSync(file)
    else fs.writeFileSync(file, ' ')
    const failed = await storage.getSigningSecret().then(
      () => false,
      () => true
    )
    expect(failed).toBe(true)
  })
  it('retains the original file and error when a replacement write fails', async () => {
    const storage = await import('./storage.js')
    const before = await storage.getSigningSecret()
    faults.failWrite = true
    await expect(storage.setSigningSecret('replacement')).rejects.toThrow('injected write failure')
    expect(fs.readFileSync(path.join(home, 'secrets', 'api-key-secret'), 'utf8') === before).toBe(
      true
    )
  })
  it.each(['open', 'write', 'sync', 'close', 'rename'])(
    'preserves the original error and file when replacement %s fails',
    async (operation) => {
      const storage = await import('./storage.js')
      const before = await storage.getSigningSecret()
      faults.operation = operation
      let caught: unknown
      try {
        await storage.setSigningSecret('replacement')
      } catch (error) {
        caught = error
      }
      expect(caught === faults.error).toBe(true)
      expect(fs.readFileSync(path.join(home, 'secrets', 'api-key-secret'), 'utf8') === before).toBe(
        true
      )
      expect(fs.readdirSync(path.join(home, 'secrets'))).toEqual(['api-key-secret'])
    }
  )
  it('warns when candidate cleanup is refused without masking the operation error', async () => {
    const storage = await import('./storage.js')
    await storage.getSigningSecret()
    faults.operation = 'write'
    faults.failCleanup = true
    const warning = vi.spyOn(process, 'emitWarning').mockImplementation(() => {
      // Capture the warning without sending it to the test runner.
    })
    let caught: unknown
    try {
      await storage.setSigningSecret('replacement')
    } catch (error) {
      caught = error
    }
    expect(caught === faults.error).toBe(true)
    expect(warning).toHaveBeenCalledOnce()
    warning.mockRestore()
  })
  it('uses the environment override without consulting a removed file', async () => {
    process.env['MACTS_API_KEY_SECRET'] = 'environment-test-secret'
    const storage = await import('./storage.js')
    await storage.setSigningSecret('file-test-secret')
    fs.unlinkSync(path.join(home, 'secrets', 'api-key-secret'))
    expect((await storage.getSigningSecret()) === 'environment-test-secret').toBe(true)
    storage.setKeyPolicy('probe', {
      version: '1',
      defaultDisposition: 'forbidden',
      apps: [],
      tags: [],
    })
    expect(storage.getKeyPolicy('probe')).toBeDefined()
    storage.closeKeyStore()
  })
  it('does not regenerate a secret removed after this process publishes it', async () => {
    const storage = await import('./storage.js')
    await storage.setSigningSecret('file-test-secret')
    fs.unlinkSync(path.join(home, 'secrets', 'api-key-secret'))
    const failed = await storage.getSigningSecret().then(
      () => false,
      () => true
    )
    expect(failed).toBe(true)
    expect(fs.existsSync(path.join(home, 'secrets', 'api-key-secret'))).toBe(false)
  })
  it.each(['removed', 'blank'])(
    'fails closed in metadata encryption when a cached file is %s',
    async (state) => {
      const storage = await import('./storage.js')
      const policy = {
        version: '1' as const,
        defaultDisposition: 'forbidden' as const,
        apps: [],
        tags: [],
      }
      storage.setKeyPolicy('probe', policy)
      const file = path.join(home, 'secrets', 'api-key-secret')
      if (state === 'removed') fs.unlinkSync(file)
      else fs.writeFileSync(file, ' ')
      expect(() => {
        storage.setKeyPolicy('probe', policy)
      }).toThrow()
      storage.closeKeyStore()
    }
  )
})
