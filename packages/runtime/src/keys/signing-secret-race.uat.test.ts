/** Independent processes must share one complete secret and interoperable keys. */
import { afterEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const exec = (script: string, dir: string, id: string, env: NodeJS.ProcessEnv): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ['--no-warnings', script, dir, id],
      { env, timeout: 30000 },
      (error, stdout) => {
        if (error instanceof Error) reject(error)
        else resolve(stdout)
      }
    )
  })
const entry = pathToFileURL(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/index.js')
).href
const processes = 8
const rounds = 5

describe('concurrent signing secret creation (issue #345)', () => {
  const work = mkdtempSync(join(tmpdir(), 'macts-secret-race-'))
  afterEach(() => {
    rmSync(work, { recursive: true, force: true })
  })
  it('publishes one secret and permits every process to read every key', async () => {
    const script = join(work, 'child.mjs')
    writeFileSync(
      script,
      `
import { createHash } from 'node:crypto'
import { existsSync, writeFileSync, readFileSync } from 'node:fs'
import { createApiKey, getSigningSecret, validateApiKey, loadKeyMetadata, closeKeyStore } from ${JSON.stringify(entry)}
const [dir, id] = process.argv.slice(2)
writeFileSync(dir + '/ready-' + id, '')
while (!existsSync(dir + '/go')) await new Promise(r => setTimeout(r, 2))
const secret = await getSigningSecret()
const hash = createHash('sha256').update(secret).digest('hex')
const { token } = await createApiKey({ name: id, permissions: ['calendar:events:list'] })
writeFileSync(dir + '/key-' + id, token)
while (!existsSync(dir + '/verify')) await new Promise(r => setTimeout(r, 2))
const tokens = JSON.parse(readFileSync(dir + '/verify', 'utf8'))
const valid = await Promise.all(tokens.map(async token => (await validateApiKey(token)).valid))
let count = -1
try { count = loadKeyMetadata().length } catch { /* An unreadable row is a failed interoperability check. */ }
closeKeyStore()
process.stdout.write(JSON.stringify({ hash, valid, count }))
`
    )
    const mismatchedRounds: number[] = []
    const invalidRounds: number[] = []
    for (let round = 0; round < rounds; round++) {
      const dir = join(work, String(round))
      const { mkdirSync } = await import('node:fs')
      mkdirSync(dir)
      const env: NodeJS.ProcessEnv = { ...process.env, MACTS_HOME: join(dir, 'home') }
      delete env['NODE_OPTIONS']
      delete env['MACTS_API_KEY_SECRET']
      const children = Array.from({ length: processes }, (_, i) =>
        exec(script, dir, String(i), env)
      )
      const waitForFiles = async (prefix: string): Promise<void> => {
        for (let attempt = 0; attempt < 3000; attempt++) {
          if (readdirSync(dir).filter((name) => name.startsWith(prefix)).length === processes)
            return
          await new Promise((r) => setTimeout(r, 10))
        }
        throw new Error(`Timed out waiting for ${prefix} files`)
      }
      await waitForFiles('ready-')
      writeFileSync(join(dir, 'go'), '')
      await waitForFiles('key-')
      const tokens = Array.from({ length: processes }, (_, i) =>
        readFileSync(join(dir, `key-${String(i)}`), 'utf8')
      )
      writeFileSync(join(dir, 'verify'), JSON.stringify(tokens))
      const results = await Promise.all(children)
      const reports = results.map(
        (stdout) => JSON.parse(stdout) as { hash: string; valid: boolean[]; count: number }
      )
      const secretFile = join(dir, 'home', 'secrets', 'api-key-secret')
      expect(existsSync(secretFile)).toBe(true)
      const diskHash = createHash('sha256')
        .update(readFileSync(secretFile, 'utf8').trim())
        .digest('hex')
      if (reports.some((r) => r.hash !== diskHash)) mismatchedRounds.push(round)
      expect(statSync(secretFile).mode & 0o777).toBe(0o600)
      for (const report of reports) {
        if (report.valid.some((valid) => !valid) || report.count !== processes)
          invalidRounds.push(round)
      }
    }
    expect({ mismatchedRounds, invalidRounds }).toEqual({ mismatchedRounds: [], invalidRounds: [] })
  }, 180000)
})
