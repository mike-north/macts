/** Independent processes must share one complete secret and interoperable keys. */
import { afterEach, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  PROCESS_UAT_TIMEOUT_MS,
  rejectOnTestChildFailure,
  runTestChild,
} from '../child-process-test-helper.js'
import { childEnvironment } from './child-environment.js'

const exec = (script: string, dir: string, id: string, env: NodeJS.ProcessEnv): Promise<string> =>
  runTestChild(`secret race round ${dir} child ${id}`, [script, dir, id], { env }).then(
    (result) => result.stdout
  )
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
  it(
    'publishes one secret and permits every process to read every key',
    async () => {
      const script = join(work, 'child.mjs')
      writeFileSync(
        script,
        `
import { createHash } from 'node:crypto'
import { existsSync, writeFileSync, readFileSync, renameSync } from 'node:fs'
import { createApiKey, getSigningSecret, validateApiKey, loadKeyMetadata, closeKeyStore } from ${JSON.stringify(entry)}
const [dir, id] = process.argv.slice(2)
writeFileSync(dir + '/ready-' + id, '')
while (!existsSync(dir + '/go')) await new Promise(r => setTimeout(r, 2))
const secret = await getSigningSecret()
const hash = createHash('sha256').update(secret).digest('hex')
const { token } = await createApiKey({ name: id, permissions: ['calendar:events:list'] })
writeFileSync(dir + '/pending-' + id, token)
renameSync(dir + '/pending-' + id, dir + '/key-' + id)
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
        const env: NodeJS.ProcessEnv = { ...childEnvironment(), MACTS_HOME: join(dir, 'home') }
        const children = Array.from({ length: processes }, (_, i) =>
          exec(script, dir, String(i), env)
        )
        const childFailure = rejectOnTestChildFailure(children)
        const waitForFiles = async (prefix: string): Promise<void> => {
          for (let attempt = 0; attempt < 3000; attempt++) {
            if (readdirSync(dir).filter((name) => name.startsWith(prefix)).length === processes)
              return
            await new Promise((r) => setTimeout(r, 10))
          }
          throw new Error(`Timed out waiting for ${prefix} files`)
        }
        let completed = false
        try {
          await Promise.race([waitForFiles('ready-'), childFailure])
          writeFileSync(join(dir, 'go'), '')
          await Promise.race([waitForFiles('key-'), childFailure])
          const tokens = Array.from({ length: processes }, (_, i) =>
            readFileSync(join(dir, `key-${String(i)}`), 'utf8')
          )
          writeFileSync(join(dir, 'verify-pending'), JSON.stringify(tokens))
          renameSync(join(dir, 'verify-pending'), join(dir, 'verify'))
          const results = await Promise.all(children)
          completed = true
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
        } finally {
          if (!completed) {
            writeFileSync(join(dir, 'go'), '')
            writeFileSync(join(dir, 'verify'), '[]')
            await Promise.allSettled(children)
          }
        }
      }
      expect({ mismatchedRounds, invalidRounds }).toEqual({
        mismatchedRounds: [],
        invalidRounds: [],
      })
    },
    PROCESS_UAT_TIMEOUT_MS
  )
})
