/**
 * UAT: opening the API-key store prints no SQLite experimental warning, and
 * leaves every other warning visible.
 *
 * Drives the BUILT package exactly as a consumer would: a separate Node
 * process imports `dist/index.js`, opens the key store under a throwaway
 * `MACTS_HOME`, then emits one unrelated warning of its own. Node 22 and 24
 * print `ExperimentalWarning: SQLite is an experimental feature …` on the
 * first load of `node:sqlite`; that line must never reach the consumer's
 * stderr, while the consumer's own warning must.
 *
 * Requires a prior build (`pnpm --filter @macts/runtime build`); the nx `test`
 * target depends on `build` for this reason.
 *
 * @see https://nodejs.org/api/sqlite.html
 * @see https://nodejs.org/api/process.html#processemitwarningwarning-options
 * @see https://nodejs.org/api/process.html#event-warning
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
// packages/runtime/src/keys → the package root is two levels up.
const builtEntry = resolve(here, '../../dist/index.js')

interface ProcessResult {
  stdout: string
  stderr: string
}

/**
 * Environment for the child process: the parent's, minus anything that would
 * silence warnings globally and so make the test pass vacuously.
 */
function childEnv(mactsHome: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, MACTS_HOME: mactsHome }
  delete env['NODE_OPTIONS']
  delete env['NODE_NO_WARNINGS']
  delete env['MACTS_API_KEY_SECRET']
  return env
}

describe('opening the key store (UAT)', () => {
  let workDir: string

  beforeAll(() => {
    if (!existsSync(builtEntry)) {
      throw new Error(
        `Built runtime not found at ${builtEntry}. Run \`pnpm --filter @macts/runtime build\` before this UAT.`
      )
    }
  })

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'macts-runtime-uat-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  /** Run a consumer script that opens the store, then emits its own warning. */
  async function runConsumer(): Promise<ProcessResult> {
    const mactsHome = join(workDir, 'home')
    const script = join(workDir, 'consumer.mjs')
    writeFileSync(
      script,
      [
        `import { closeKeyStore, loadKeyMetadata } from ${JSON.stringify(pathToFileURL(builtEntry).href)}`,
        `const keys = loadKeyMetadata()`,
        `process.emitWarning('probe', 'CustomWarning')`,
        `closeKeyStore()`,
        `console.log(JSON.stringify({ keyCount: keys.length }))`,
      ].join('\n')
    )
    return execFileAsync(process.execPath, [script], { env: childEnv(mactsHome), cwd: workDir })
  }

  it('creates the store and reads it', async () => {
    const { stdout } = await runConsumer()

    expect(JSON.parse(stdout)).toEqual({ keyCount: 0 })
    expect(existsSync(join(workDir, 'home', 'api-keys.db'))).toBe(true)
  })

  it('prints no SQLite ExperimentalWarning', async () => {
    const { stderr } = await runConsumer()

    expect(stderr).not.toMatch(/ExperimentalWarning[^\n]*SQLite/)
    expect(stderr).not.toContain('SQLite is an experimental feature')
  })

  it("still prints the consumer's own warning", async () => {
    const { stderr } = await runConsumer()

    // Node's default warning printer: "(node:<pid>) <name>: <message>".
    expect(stderr).toMatch(/\(node:\d+\) CustomWarning: probe/)
  })
})
