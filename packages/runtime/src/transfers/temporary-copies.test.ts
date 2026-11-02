/**
 * Temporary copies: files materialized for a local read, released by the
 * caller and removed by the sweep when abandoned.
 *
 * Expected values come from phases/13 D8 ("TemporaryFileCopy") and the
 * documented limits: a temporary copy is kept at most 60 minutes.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { describe, expect, it } from 'vitest'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ALICE, useTransferStore } from './transfer-test-helpers.js'

describe('registerTemporaryCopy', () => {
  const fixture = useTransferStore()

  /** Write a file into the store's copy directory and return its path. */
  function makeCopy(name: string): string {
    const copy = join(fixture.store.temporaryCopyDirectory, name)
    writeFileSync(copy, 'copied bytes')
    return copy
  }

  it('keeps the copies directory under the store home', () => {
    expect(fixture.store.temporaryCopyDirectory).toBe(join(fixture.home, 'transfers', 'copies'))
  })

  it('registers a copy that expires 60 minutes from now', async () => {
    const registered = await fixture.store.registerTemporaryCopy(ALICE, makeCopy('a.pdf'))
    expect(registered.expiresAt).toEqual(new Date('2026-01-15T11:00:00.000Z'))
  })

  it('release() deletes the file and is idempotent', async () => {
    const copy = makeCopy('b.pdf')
    const registered = await fixture.store.registerTemporaryCopy(ALICE, copy)

    await Promise.all([registered.release(), registered.release()])
    expect(existsSync(copy)).toBe(false)
    await expect(registered.release()).resolves.toBeUndefined()
  })

  it('release() succeeds when the file is already gone', async () => {
    const registered = await fixture.store.registerTemporaryCopy(
      ALICE,
      join(fixture.store.temporaryCopyDirectory, 'never-written')
    )
    await expect(registered.release()).resolves.toBeUndefined()
  })

  it('renews a path registered again', async () => {
    const copy = makeCopy('c.pdf')
    await fixture.store.registerTemporaryCopy(ALICE, copy)
    fixture.clock.set('2026-01-15T10:30:00.000Z')
    const renewed = await fixture.store.registerTemporaryCopy(ALICE, copy)
    expect(renewed.expiresAt).toEqual(new Date('2026-01-15T11:30:00.000Z'))

    fixture.clock.set('2026-01-15T11:00:00.000Z')
    await fixture.store.sweep()
    expect(existsSync(copy)).toBe(true)
  })

  it('refuses a path outside the copies directory, so the store never deletes other files', async () => {
    const outside = join(fixture.home, 'precious.txt')
    writeFileSync(outside, 'keep me')

    for (const candidate of [
      outside,
      join(fixture.store.temporaryCopyDirectory, '..', 'precious.txt'),
      fixture.store.temporaryCopyDirectory,
      'relative.txt',
    ]) {
      await expect(fixture.store.registerTemporaryCopy(ALICE, candidate)).rejects.toThrow(
        RangeError
      )
    }
    expect(existsSync(outside)).toBe(true)
  })
})
