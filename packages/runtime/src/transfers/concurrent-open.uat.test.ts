/**
 * UAT: several processes opening the transfer store on one fresh home at the
 * same moment all succeed, and the schema is created exactly once.
 *
 * Drives the BUILT package as a consumer would (the CLI and a running
 * service opening a new macts home together): separate Node processes import
 * `dist/index.js` and open the store concurrently. Each must wait for the
 * others' locks rather than fail, and the store they share must work.
 *
 * Requires a prior build (`pnpm --filter @macts/runtime build`); the nx `test`
 * target depends on `build` for this reason.
 *
 * @see https://www.sqlite.org/pragma.html#pragma_busy_timeout
 * @see https://www.sqlite.org/wal.html
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
// packages/runtime/src/transfers → the package root is two levels up.
const builtEntry = resolve(here, '../../dist/index.js')

/** How many processes open the store at once. */
const PROCESSES = 4

describe('opening one fresh home from several processes at once (UAT)', () => {
  let workDir: string

  beforeAll(() => {
    if (!existsSync(builtEntry)) {
      throw new Error(
        `Built runtime not found at ${builtEntry}. Run \`pnpm --filter @macts/runtime build\` before this UAT.`
      )
    }
  })

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'macts-transfers-uat-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  it('succeeds in every process, and each sees the grants the others issued', async () => {
    const home = join(workDir, 'home')
    const script = join(workDir, 'open-store.mjs')
    writeFileSync(
      script,
      [
        `import { createTransferStore } from ${JSON.stringify(pathToFileURL(builtEntry).href)}`,
        `const store = await createTransferStore({ home: ${JSON.stringify(home)} })`,
        `const grant = await store.issueGrant('key_uat', { app: 'finder', observedAt: new Date(0) })`,
        `store.close()`,
        `process.stdout.write(grant.token)`,
      ].join('\n')
    )

    const results = await Promise.all(
      Array.from({ length: PROCESSES }, () =>
        execFileAsync(process.execPath, ['--no-warnings', script], { env: { ...process.env } })
      )
    )
    const tokens = results.map((result) => result.stdout)

    const verify = join(workDir, 'verify.mjs')
    writeFileSync(
      verify,
      [
        `import { createTransferStore } from ${JSON.stringify(pathToFileURL(builtEntry).href)}`,
        `const store = await createTransferStore({ home: ${JSON.stringify(home)} })`,
        `const tokens = JSON.parse(process.argv[2])`,
        `for (const token of tokens) await store.redeemGrant('key_uat', token)`,
        `store.close()`,
        `process.stdout.write('redeemed ' + tokens.length)`,
      ].join('\n')
    )
    const { stdout } = await execFileAsync(process.execPath, [
      '--no-warnings',
      verify,
      JSON.stringify(tokens),
    ])

    expect(new Set(tokens).size).toBe(PROCESSES)
    expect(stdout).toBe(`redeemed ${String(PROCESSES)}`)
  })
})
