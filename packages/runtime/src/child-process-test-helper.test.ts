/** Consumer-process failures report which child failed and what it wrote. */
import { expect, it } from 'vitest'
import { rejectOnTestChildFailure, runTestChild } from './child-process-test-helper.js'

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
