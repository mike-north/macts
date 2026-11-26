/** Consumer-process failures report which child failed and what it wrote. */
import { mkdtempSync, existsSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import {
  rejectOnTestChildFailure,
  runTestChild,
  runTestChildGroup,
} from './child-process-test-helper.js'

it('waits for siblings to exit before reporting the first child failure', async () => {
  const work = mkdtempSync(join(tmpdir(), 'macts-group-'))
  const ready = [join(work, 'ready-0'), join(work, 'ready-1')]
  const release = join(work, 'release')
  const siblings = ready.map((file, index) =>
    runTestChild(`sibling ${String(index)}`, [
      '-e',
      `
    const fs = require('node:fs')
    fs.writeFileSync(${JSON.stringify(file)}, '')
    const timer = setInterval(() => { if (fs.existsSync(${JSON.stringify(release)})) { clearInterval(timer) } }, 10)
  `,
    ])
  )
  let siblingsSettled = 0
  for (const sibling of siblings) {
    void sibling.then(
      () => {
        siblingsSettled++
      },
      () => {
        siblingsSettled++
      }
    )
  }
  const failed = runTestChild('fast failure', [
    '-e',
    `
    const fs = require('node:fs')
    const files = ${JSON.stringify(ready)}
    const timer = setInterval(() => { if (files.every(file => fs.existsSync(file))) { clearInterval(timer); process.stderr.write('failure marker'); process.exitCode = 7 } }, 10)
  `,
  ])
  try {
    const result = runTestChildGroup([failed, ...siblings]).then(
      () => ({ error: undefined, siblingsSettled }),
      (error: unknown) => ({ error, siblingsSettled })
    )
    await failed.catch(() => {
      /* The group retains this failure for its result. */
    })
    await new Promise<void>((resolve) => setImmediate(resolve))
    writeFileSync(release, '')
    const outcome = await result
    expect(outcome.siblingsSettled).toBe(2)
    expect(outcome.error).toBeInstanceOf(Error)
    if (!(outcome.error instanceof Error)) throw new Error('Expected a child failure')
    expect(outcome.error.message).toContain('fast failure')
    expect(outcome.error.message).toMatch(/\d+ ms/)
    expect(outcome.error.message).toContain('failure marker')
  } finally {
    writeFileSync(release, '')
    await Promise.allSettled([failed, ...siblings])
    rmSync(work, { recursive: true, force: true })
  }
}, 40000)

it('does not run a session preload or inherit a secret override in a consumer', async () => {
  const work = mkdtempSync(join(tmpdir(), 'macts-child-env-'))
  const marker = join(work, 'preload-ran')
  const preload = join(work, 'preload.mjs')
  writeFileSync(
    preload,
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, '')`
  )
  const previousOptions = process.env['NODE_OPTIONS']
  const previousSecret = process.env['MACTS_API_KEY_SECRET']
  const previousWarnings = process.env['NODE_NO_WARNINGS']
  const hadGuard = previousOptions?.includes('macts-nonnative-process-guard.mjs') ?? false
  process.env['NODE_OPTIONS'] =
    `${previousOptions ?? ''} --import ${JSON.stringify(preload)} --conditions=probe --no-warnings`
  process.env['MACTS_API_KEY_SECRET'] = 'test-only-override'
  process.env['NODE_NO_WARNINGS'] = '1'
  try {
    const result = await runTestChild('isolated consumer', [
      '-e',
      "process.stdout.write(JSON.stringify({ secret: Boolean(process.env.MACTS_API_KEY_SECRET), guard: (process.env.NODE_OPTIONS ?? '').includes('macts-nonnative-process-guard.mjs'), extra: (process.env.NODE_OPTIONS ?? '').includes('--conditions=probe'), warnings: Boolean(process.env.NODE_NO_WARNINGS) }))",
    ])
    const parsed: unknown = JSON.parse(result.stdout)
    expect({ child: parsed, preloadRan: existsSync(marker) }).toEqual({
      child: { secret: false, guard: hadGuard, extra: false, warnings: false },
      preloadRan: false,
    })
  } finally {
    if (previousOptions === undefined) delete process.env['NODE_OPTIONS']
    else process.env['NODE_OPTIONS'] = previousOptions
    if (previousSecret === undefined) delete process.env['MACTS_API_KEY_SECRET']
    else process.env['MACTS_API_KEY_SECRET'] = previousSecret
    if (previousWarnings === undefined) delete process.env['NODE_NO_WARNINGS']
    else process.env['NODE_NO_WARNINGS'] = previousWarnings
    rmSync(work, { recursive: true, force: true })
  }
}, 40000)

it.each(['copied session', 'replaced options'])(
  'isolates a consumer when the caller supplies %s',
  async (kind) => {
    const work = mkdtempSync(join(tmpdir(), 'macts-child-override-'))
    const marker = join(work, 'preload-ran')
    const preload = join(work, 'preload.mjs')
    writeFileSync(
      preload,
      `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, '')`
    )
    const previousOptions = process.env['NODE_OPTIONS']
    const previousSecret = process.env['MACTS_API_KEY_SECRET']
    const previousWarnings = process.env['NODE_NO_WARNINGS']
    const hadGuard = previousOptions?.includes('macts-nonnative-process-guard.mjs') ?? false
    process.env['NODE_OPTIONS'] =
      `${previousOptions ?? ''} --import ${JSON.stringify(preload)} --conditions=probe`
    process.env['MACTS_API_KEY_SECRET'] = 'test-only-override'
    process.env['NODE_NO_WARNINGS'] = '1'
    const env: NodeJS.ProcessEnv = { ...process.env, MACTS_HOME: 'test-home' }
    if (kind === 'replaced options') env['NODE_OPTIONS'] = '--conditions=probe'
    try {
      const result = await runTestChild(
        'forwarded environment',
        [
          '-e',
          "process.stdout.write(JSON.stringify({ secret: Boolean(process.env.MACTS_API_KEY_SECRET), guard: (process.env.NODE_OPTIONS ?? '').includes('macts-nonnative-process-guard.mjs'), extra: (process.env.NODE_OPTIONS ?? '').includes('--conditions=probe'), warnings: Boolean(process.env.NODE_NO_WARNINGS), home: process.env.MACTS_HOME }))",
        ],
        { env }
      )
      const parsed: unknown = JSON.parse(result.stdout)
      expect({ child: parsed, preloadRan: existsSync(marker) }).toEqual({
        child: { secret: false, guard: hadGuard, extra: false, warnings: false, home: 'test-home' },
        preloadRan: false,
      })
    } finally {
      if (previousOptions === undefined) delete process.env['NODE_OPTIONS']
      else process.env['NODE_OPTIONS'] = previousOptions
      if (previousSecret === undefined) delete process.env['MACTS_API_KEY_SECRET']
      else process.env['MACTS_API_KEY_SECRET'] = previousSecret
      if (previousWarnings === undefined) delete process.env['NODE_NO_WARNINGS']
      else process.env['NODE_NO_WARNINGS'] = previousWarnings
      rmSync(work, { recursive: true, force: true })
    }
  },
  40000
)

it('surfaces a child failure while a synchronization point is still pending', async () => {
  const failure = new Error('child failed')
  const child = Promise.reject(failure)
  const barrier = new Promise<never>(() => {
    /* The child failed before reaching the synchronization point. */
  })
  await expect(Promise.race([barrier, rejectOnTestChildFailure([child])])).rejects.toBe(failure)
})

it('reports the child, elapsed time, and stderr when it fails', async () => {
  const error: unknown = await runTestChild('failing consumer', [
    '-e',
    "process.stderr.write('failure marker'); process.exitCode = 7",
  ]).catch((reason: unknown) => reason)
  expect(error).toBeInstanceOf(Error)
  if (!(error instanceof Error)) throw new Error('Expected a child failure')
  expect(error.message).toContain('failing consumer')
  expect(error.message).toMatch(/\d+ ms/)
  expect(error.message).toContain('failure marker')
})

it('reports a timed-out child and its stderr', async () => {
  const error: unknown = await runTestChild(
    'stalled consumer',
    ['-e', "process.stderr.write('timeout marker'); setInterval(() => {}, 1000)"],
    { timeoutMs: 5000 }
  ).catch((reason: unknown) => reason)
  expect(error).toBeInstanceOf(Error)
  if (!(error instanceof Error)) throw new Error('Expected a child timeout')
  expect(error.message).toContain('stalled consumer')
  expect(error.message).toContain('timed out')
  expect(error.message).toMatch(/\d+ ms/)
  expect(error.message).toContain('timeout marker')
}, 20000)
