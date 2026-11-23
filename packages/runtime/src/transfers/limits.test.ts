/**
 * The documented transfer limits and the validation of overrides.
 *
 * Each expected value is the limit as stated in phases/13 D8 "Limits and
 * lifecycle", written out by hand.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D8)
 */

import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  CONSUMED_UPLOAD_RETENTION_MS,
  DEFAULT_TRANSFER_LIMITS,
  DOWNLOAD_LINK_TTL_MS,
  FILE_GRANT_TTL_MS,
  MAX_OUTSTANDING_UPLOAD_BYTES_PER_SUBJECT,
  MAX_OUTSTANDING_UPLOADS_PER_SUBJECT,
  MAX_UPLOAD_BYTES,
  TEMPORARY_COPY_TTL_MS,
  UPLOAD_TTL_MS,
  resolveTransferLimits,
} from './limits.js'
import { createTransferStore } from './store.js'

describe('transfer limits', () => {
  it('states the documented defaults', () => {
    expect(MAX_UPLOAD_BYTES).toBe(104_857_600) // 100 MiB
    expect(MAX_OUTSTANDING_UPLOADS_PER_SUBJECT).toBe(16)
    expect(MAX_OUTSTANDING_UPLOAD_BYTES_PER_SUBJECT).toBe(536_870_912) // 512 MiB
    expect(UPLOAD_TTL_MS).toBe(900_000) // 15 minutes
    expect(CONSUMED_UPLOAD_RETENTION_MS).toBe(900_000) // 15 minutes
    expect(FILE_GRANT_TTL_MS).toBe(900_000) // 15 minutes
    expect(DOWNLOAD_LINK_TTL_MS).toBe(300_000) // 5 minutes
    expect(TEMPORARY_COPY_TTL_MS).toBe(3_600_000) // 60 minutes
  })

  it('assembles the defaults from the named constants, frozen', () => {
    expect(DEFAULT_TRANSFER_LIMITS).toEqual({
      maxUploadBytes: 104_857_600,
      maxOutstandingUploadsPerSubject: 16,
      maxOutstandingUploadBytesPerSubject: 536_870_912,
      uploadTtlMs: 900_000,
      consumedUploadRetentionMs: 900_000,
      fileGrantTtlMs: 900_000,
      downloadLinkTtlMs: 300_000,
      temporaryCopyTtlMs: 3_600_000,
    })
    expect(Object.isFrozen(DEFAULT_TRANSFER_LIMITS)).toBe(true)
  })
})

describe('resolveTransferLimits', () => {
  it('returns the defaults when nothing is overridden', () => {
    expect(resolveTransferLimits()).toEqual(DEFAULT_TRANSFER_LIMITS)
  })

  it('overrides only the given bounds', () => {
    expect(resolveTransferLimits({ maxUploadBytes: 10 })).toEqual({
      ...DEFAULT_TRANSFER_LIMITS,
      maxUploadBytes: 10,
    })
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s as a bound', (value) => {
    expect(() => resolveTransferLimits({ uploadTtlMs: value })).toThrow(
      /uploadTtlMs must be a positive integer/
    )
  })
})

describe('createTransferStore limits', () => {
  let home: string | undefined

  afterEach(() => {
    if (home !== undefined) {
      rmSync(home, { recursive: true, force: true })
      home = undefined
    }
  })

  it('exposes the limits it enforces', async () => {
    home = mkdtempSync(join(tmpdir(), 'macts-transfers-'))
    const store = await createTransferStore({ home, limits: { downloadLinkTtlMs: 1000 } })
    try {
      expect(store.limits).toEqual({ ...DEFAULT_TRANSFER_LIMITS, downloadLinkTtlMs: 1000 })
    } finally {
      store.close()
    }
  })

  it('refuses invalid overrides before touching disk', async () => {
    home = mkdtempSync(join(tmpdir(), 'macts-transfers-'))
    await expect(createTransferStore({ home, limits: { maxUploadBytes: 0 } })).rejects.toThrow(
      RangeError
    )
    expect(existsSync(join(home, 'transfers'))).toBe(false)
  })
})
