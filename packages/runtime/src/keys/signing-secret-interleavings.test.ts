/** File observation prevents later bootstrap publication across async pauses. */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const gate = vi.hoisted(() => ({
  phase: '',
  reached: () => {
    /* Replaced by each barrier. */
  },
  release: Promise.resolve(),
}))
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readFile: async (...args: Parameters<typeof actual.readFile>) => {
      if (
        gate.phase === 'read' &&
        typeof args[0] === 'string' &&
        args[0].endsWith('/api-key-secret')
      ) {
        gate.reached()
        await gate.release
      }
      return actual.readFile(...args)
    },
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args)
      if (gate.phase === 'write') {
        const write = handle.writeFile.bind(handle)
        handle.writeFile = async (...writeArgs: Parameters<typeof handle.writeFile>) => {
          gate.reached()
          await gate.release
          return write(...writeArgs)
        }
      }
      return handle
    },
    unlink: async (...args: Parameters<typeof actual.unlink>) => {
      if (gate.phase === 'unlink') {
        gate.reached()
        await gate.release
      }
      return actual.unlink(...args)
    },
  }
})

it('refuses a candidate after observing different bytes even if those bytes change back', async () => {
  const file = path.join(home, 'secrets', 'api-key-secret')
  gate.phase = 'unlink'
  let resume = () => {
    /* Replaced by the barrier. */
  }
  gate.release = new Promise<void>((resolve) => {
    resume = resolve
  })
  const reached = new Promise<void>((resolve) => {
    gate.reached = resolve
  })
  const storage = await import('./storage.js')
  const pending = storage.getSigningSecret()
  try {
    await reached
    const candidate = fs.readFileSync(file, 'utf8')
    const policy = {
      version: '1' as const,
      defaultDisposition: 'forbidden' as const,
      apps: [],
      tags: [],
    }
    fs.writeFileSync(file, 'another-complete-test-secret')
    storage.setKeyPolicy('probe', policy)
    fs.writeFileSync(file, candidate)
    storage.setKeyPolicy('probe', policy)
    resume()
    expect(
      await pending.then(
        () => false,
        () => true
      )
    ).toBe(true)
  } finally {
    resume()
    storage.closeKeyStore()
  }
})

let home: string
let previousHome: string | undefined
let previousSecret: string | undefined
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-interleaving-'))
  previousHome = process.env['MACTS_HOME']
  previousSecret = process.env['MACTS_API_KEY_SECRET']
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  vi.resetModules()
})
afterEach(() => {
  gate.phase = ''
  if (previousHome === undefined) delete process.env['MACTS_HOME']
  else process.env['MACTS_HOME'] = previousHome
  if (previousSecret === undefined) delete process.env['MACTS_API_KEY_SECRET']
  else process.env['MACTS_API_KEY_SECRET'] = previousSecret
  fs.rmSync(home, { recursive: true, force: true })
})

it.each(['read', 'write'])(
  'does not create after metadata observes a secret during %s',
  async (phase) => {
    const file = path.join(home, 'secrets', 'api-key-secret')
    if (phase === 'read') {
      fs.mkdirSync(path.dirname(file))
      fs.writeFileSync(file, 'known-complete-secret')
    }
    gate.phase = phase
    let resume = () => {
      /* Replaced by the barrier. */
    }
    gate.release = new Promise<void>((resolve) => {
      resume = resolve
    })
    const reached = new Promise<void>((resolve) => {
      gate.reached = resolve
    })
    const storage = await import('./storage.js')
    const pending = storage.getSigningSecret()
    try {
      await reached
      storage.setKeyPolicy('probe', {
        version: '1',
        defaultDisposition: 'forbidden',
        apps: [],
        tags: [],
      })
      fs.unlinkSync(file)
      resume()
      const rejected = await pending.then(
        () => false,
        () => true
      )
      expect(rejected).toBe(true)
      expect(fs.existsSync(file)).toBe(false)
    } finally {
      resume()
      storage.closeKeyStore()
    }
  }
)
