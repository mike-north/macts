/**
 * UAT: several processes opening the API-key store on one fresh home at the
 * same moment all succeed, and they share one working store.
 *
 * Drives the BUILT package as a consumer would (the CLI and a running server
 * starting together on a new macts home): separate Node processes import
 * `dist/index.js` and open the key store concurrently. Switching a fresh
 * database to WAL can be refused as busy without waiting, so each process must
 * retry rather than fail with `database is locked`.
 *
 * Requires a prior build (`pnpm --filter @macts/runtime build`); the nx `test`
 * target depends on `build` for this reason.
 *
 * @see https://www.sqlite.org/pragma.html#pragma_busy_timeout
 * @see https://www.sqlite.org/wal.html
 * @see https://www.sqlite.org/c3ref/busy_handler.html
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Capture both streams even when execFile is wrapped by a process guard. */
function execFileAsync(
  file: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv; cwd: string }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error instanceof Error) reject(error)
      else resolve({ stdout, stderr })
    })
  })
}

const here = dirname(fileURLToPath(import.meta.url))
// packages/runtime/src/keys → the package root is two levels up.
const builtEntry = resolve(here, '../../dist/index.js')

/**
 * How many processes open the store at once. More processes make it likelier
 * that several contend for the exclusive lock the first switch to WAL needs.
 */
const PROCESSES = 8

describe('opening one fresh key store from several processes at once (UAT)', () => {
  let workDir: string

  beforeAll(() => {
    if (!existsSync(builtEntry)) {
      throw new Error(
        `Built runtime not found at ${builtEntry}. Run \`pnpm --filter @macts/runtime build\` before this UAT.`
      )
    }
  })

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'macts-keystore-uat-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  /** Environment for a child process: the parent's, with a throwaway home and no inherited secret. */
  function childEnv(home: string): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env, MACTS_HOME: home }
    delete env['MACTS_API_KEY_SECRET']
    return env
  }

  it('succeeds in every process, and the store they share then works', async () => {
    const home = join(workDir, 'home')
    const entry = JSON.stringify(pathToFileURL(builtEntry).href)
    const open = join(workDir, 'open-store.mjs')
    writeFileSync(
      open,
      [
        `import { closeKeyStore, loadKeyMetadata } from ${entry}`,
        `const count = loadKeyMetadata().length`,
        `closeKeyStore()`,
        `process.stdout.write(String(count))`,
      ].join('\n')
    )

    const results = await Promise.all(
      Array.from({ length: PROCESSES }, () =>
        execFileAsync(process.execPath, ['--no-warnings', open], {
          env: childEnv(home),
          cwd: workDir,
        })
      )
    )

    const use = join(workDir, 'use-store.mjs')
    writeFileSync(
      use,
      [
        `import { closeKeyStore, createApiKey, loadKeyMetadata } from ${entry}`,
        `const { keyId } = await createApiKey({ name: 'uat', permissions: ['calendar:events:list'] })`,
        `const listed = loadKeyMetadata().map((key) => key.id)`,
        `closeKeyStore()`,
        `process.stdout.write(JSON.stringify({ keyId, listed }))`,
      ].join('\n')
    )
    const { stdout } = await execFileAsync(process.execPath, ['--no-warnings', use], {
      env: childEnv(home),
      cwd: workDir,
    })
    const used = JSON.parse(stdout) as { keyId: string; listed: string[] }

    // Every process opened an empty store; the store then accepts and lists a key.
    expect(results.map((result) => result.stdout)).toEqual(Array<string>(PROCESSES).fill('0'))
    expect(used.listed).toEqual([used.keyId])
  })
})
