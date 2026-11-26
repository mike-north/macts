/** First-use callers adopt the complete secret published by any winner. */
import { afterEach, beforeEach, expect, it } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  PROCESS_UAT_TIMEOUT_MS,
  rejectOnTestChildFailure,
  runTestChild,
  runTestChildGroup,
} from '../child-process-test-helper.js'

const entry = pathToFileURL(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/index.js')
).href
let work: string
beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'macts-first-use-'))
})
afterEach(() => {
  rmSync(work, { recursive: true, force: true })
})

/** Wait for a consumer to request its competing publisher. */
async function waitFor(file: string): Promise<void> {
  for (let i = 0; i < 3000; i++) {
    if (existsSync(file)) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for the competing publisher')
}

it.each(['sync-wins', 'external-wins', 'own-wins', 'eight-callers'])(
  'adopts the current secret when %s',
  async (mode) => {
    const winner = join(work, 'winner.mjs')
    writeFileSync(
      winner,
      `import * as m from ${JSON.stringify(entry)}; await m.getSigningSecret(); m.closeKeyStore()`
    )
    const script = join(work, 'consumer.mjs')
    writeFileSync(
      script,
      `
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
const [mode, dir] = process.argv.slice(2)
const file = process.env.MACTS_HOME + '/secrets/api-key-secret'
function barrier() {
  let reached, release
  const ready = new Promise(r => { reached = r })
  const go = new Promise(r => { release = r })
  return { ready, release, pause: async () => { reached(); await go } }
}
const writeGate = barrier(), unlinkGate = barrier()
if (mode !== 'eight-callers') {
  const open = fsp.open, unlink = fsp.unlink
  fsp.open = async (...args) => {
    const h = await open(...args), write = h.writeFile.bind(h)
    h.writeFile = async (...args) => { await writeGate.pause(); return write(...args) }
    return h
  }
  fsp.unlink = async (...args) => { await unlinkGate.pause(); return unlink(...args) }
  syncBuiltinESMExports()
}
const m = await import(${JSON.stringify(entry)})
const policy = { version: '1', defaultDisposition: 'forbidden', apps: [], tags: [] }
try {
  if (mode === 'eight-callers') {
    const results = await Promise.all(Array.from({ length: 8 }, () => m.getSigningSecret()))
    const disk = fs.readFileSync(file, 'utf8').trim()
    process.stdout.write(JSON.stringify({ matches: results.every(value => value === disk), clean: fs.readdirSync(process.env.MACTS_HOME + '/secrets').length === 1 }))
  } else {
    const pending = m.getSigningSecret().then(value => ({ ok: true, value }), () => ({ ok: false }))
    await writeGate.ready
    if (mode === 'sync-wins') m.setKeyPolicy('probe', policy)
    if (mode === 'external-wins') {
      fs.writeFileSync(dir + '/winner-request', '')
      while (!fs.existsSync(dir + '/winner-done')) await new Promise(r => setTimeout(r, 10))
    }
    writeGate.release()
    if (mode !== 'sync-wins') { await unlinkGate.ready; m.setKeyPolicy('probe', policy) }
    const disk = fs.readFileSync(file, 'utf8').trim(), identity = fs.statSync(file).ino
    unlinkGate.release()
    const result = await pending
    process.stdout.write(JSON.stringify({ matches: result.ok && result.value === disk, unchanged: fs.statSync(file).ino === identity && fs.readFileSync(file, 'utf8').trim() === disk, clean: fs.readdirSync(process.env.MACTS_HOME + '/secrets').length === 1, sync: m.getKeyPolicy('probe')?.version === '1' }))
  }
} finally { writeGate.release(); unlinkGate.release(); m.closeKeyStore() }
`
    )
    const env = { MACTS_HOME: join(work, 'home') }
    const consumer = runTestChild(`first-use ${mode}`, [script, mode, work], { env })
    let publisher: ReturnType<typeof runTestChild> | undefined
    let failure: unknown
    try {
      if (mode === 'external-wins') {
        await Promise.race([
          waitFor(join(work, 'winner-request')),
          rejectOnTestChildFailure([consumer]),
        ])
        publisher = runTestChild('external winner', [winner], { env })
        await Promise.race([publisher, rejectOnTestChildFailure([consumer, publisher])])
        writeFileSync(join(work, 'winner-done'), '')
      }
      await consumer
    } catch (error) {
      failure = error
    } finally {
      if (mode === 'external-wins') writeFileSync(join(work, 'winner-done'), '')
      try {
        await runTestChildGroup(publisher ? [consumer, publisher] : [consumer])
      } catch (error) {
        if (failure === undefined) failure = error
      }
    }
    if (failure instanceof Error) throw failure
    if (failure !== undefined) throw new Error('Child operation failed', { cause: failure })
    const { stdout } = await consumer
    expect(JSON.parse(stdout)).toEqual(
      mode === 'eight-callers'
        ? { matches: true, clean: true }
        : { matches: true, unchanged: true, clean: true, sync: true }
    )
  },
  PROCESS_UAT_TIMEOUT_MS
)
