/** Separate processes observe complete secrets and pick up rotations. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  PROCESS_UAT_TIMEOUT_MS,
  rejectOnTestChildFailure,
  runTestChild,
} from '../child-process-test-helper.js'
import { childEnvironment } from './child-environment.js'

const entry = pathToFileURL(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/index.js')
).href
const oldSecret = 'old-test-signing-secret'
const newSecret = 'new-test-signing-secret-with-more-bytes'
const hash = (s: string): string => createHash('sha256').update(s).digest('hex')

/** Run the built package in a separate process with the same guarded environment. */
function child(script: string, dir: string, role: string): Promise<string> {
  const env: NodeJS.ProcessEnv = { ...childEnvironment(), MACTS_HOME: join(dir, 'home') }
  return runTestChild(`replacement ${role}`, [script, dir, role], { env }).then(
    (result) => result.stdout
  )
}

/** Wait for a child to reach a named synchronization point. */
async function waitFor(file: string): Promise<void> {
  for (let i = 0; i < 3000; i++) {
    if (existsSync(file)) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for child')
}

describe('signing secret replacement across processes', () => {
  let work: string
  beforeEach(() => {
    work = mkdtempSync(join(tmpdir(), 'macts-replace-'))
  })
  afterEach(() => {
    rmSync(work, { recursive: true, force: true })
  })

  it(
    'keeps both reader paths on complete secrets during a paused write',
    async () => {
      const home = join(work, 'home', 'secrets')
      mkdirSync(home, { recursive: true })
      writeFileSync(join(home, 'api-key-secret'), oldSecret)
      const script = join(work, 'child.mjs')
      writeFileSync(
        script,
        `
import fs from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { createHash } from 'node:crypto'
const [dir, role] = process.argv.slice(2)
const pause = async () => { writeFileSync(dir + '/paused', ''); while (!existsSync(dir + '/go')) await new Promise(r => setTimeout(r, 2)) }
if (role === 'replace') {
  const write = fs.writeFile
  fs.writeFile = async (file, data, options) => { await write(file, data.slice(0, 4), options); await pause(); await write(file, data, options) }
  const open = fs.open
  fs.open = async (...args) => { const h = await open(...args); h.writeFile = async data => { await h.write(data.slice(0, 4)); await pause(); await h.write(data.slice(4)) }; return h }
  syncBuiltinESMExports()
}
const m = await import(${JSON.stringify(entry)})
if (role === 'replace') await m.setSigningSecret(${JSON.stringify(newSecret)})
else if (role === 'async') process.stdout.write(createHash('sha256').update(await m.getSigningSecret()).digest('hex'))
else if (role === 'sync' || role === 'sync-new') {
  const { DatabaseSync } = await import('node:sqlite')
  m.setKeyPolicy('probe', { version: '1', defaultDisposition: 'forbidden', apps: [], tags: [] })
  m.closeKeyStore()
  const db = new DatabaseSync(dir + '/home/api-keys.db')
  const blob = db.prepare('SELECT policy FROM api_key_policies WHERE key_id = ?').get('probe').policy
  db.close()
  let matched = false
  try { m.decrypt(blob, m.deriveEncryptionKey(role === 'sync' ? ${JSON.stringify(oldSecret)} : ${JSON.stringify(newSecret)})); matched = true } catch {}
  process.stdout.write(String(matched))
}
`
      )
      const replacing = child(script, work, 'replace')
      const replacementFailure = rejectOnTestChildFailure([replacing])
      try {
        await Promise.race([waitFor(join(work, 'paused')), replacementFailure])
        const results = await Promise.all([
          child(script, work, 'async'),
          child(script, work, 'sync'),
        ])
        expect(results).toEqual([hash(oldSecret), 'true'])
      } finally {
        writeFileSync(join(work, 'go'), '')
        await replacing
      }
      const results = await Promise.all([
        child(script, work, 'async'),
        child(script, work, 'sync-new'),
      ])
      expect(results).toEqual([hash(newSecret), 'true'])
      expect(statSync(join(home, 'api-key-secret')).mode & 0o777).toBe(0o600)
    },
    PROCESS_UAT_TIMEOUT_MS
  )

  it.each(['async', 'sync'])(
    'refreshes a running process on its next %s operation',
    async (kind) => {
      const home = join(work, 'home', 'secrets')
      mkdirSync(home, { recursive: true })
      writeFileSync(join(home, 'api-key-secret'), oldSecret)
      const script = join(work, 'rotation.mjs')
      writeFileSync(
        script,
        `
import { existsSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import * as m from ${JSON.stringify(entry)}
const [dir, role] = process.argv.slice(2)
if (role === 'replace') await m.setSigningSecret(${JSON.stringify(newSecret)})
else {
  const policy = { version: '1', defaultDisposition: 'forbidden', apps: [], tags: [] }
  if (role === 'async') await m.getSigningSecret()
  else m.setKeyPolicy('probe', policy)
  writeFileSync(dir + '/ready', '')
  while (!existsSync(dir + '/go')) await new Promise(r => setTimeout(r, 2))
  if (role === 'async') process.stdout.write(createHash('sha256').update(await m.getSigningSecret()).digest('hex'))
  else {
    m.setKeyPolicy('probe', policy)
    m.closeKeyStore()
    const db = new DatabaseSync(dir + '/home/api-keys.db')
    const blob = db.prepare('SELECT policy FROM api_key_policies WHERE key_id = ?').get('probe').policy
    db.close()
    let matched = false
    try { m.decrypt(blob, m.deriveEncryptionKey(${JSON.stringify(newSecret)})); matched = true } catch {}
    process.stdout.write(String(matched))
  }
}
`
      )
      const reader = child(script, work, kind)
      const readerFailure = rejectOnTestChildFailure([reader])
      let replaced = false
      try {
        await Promise.race([waitFor(join(work, 'ready')), readerFailure])
        await child(script, work, 'replace')
        replaced = true
      } finally {
        writeFileSync(join(work, 'go'), '')
        if (!replaced) await Promise.allSettled([reader])
      }
      expect(await reader).toBe(kind === 'async' ? hash(newSecret) : 'true')
    },
    PROCESS_UAT_TIMEOUT_MS
  )
})
