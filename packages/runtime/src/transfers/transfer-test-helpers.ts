/**
 * Shared fixtures for transfer store tests: a throwaway macts home, a
 * controllable clock starting at a fixed instant, byte sources, and
 * assertions for structured transfer failures.
 */

import { afterEach, beforeEach, expect } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RateLimitedError, TransferError } from '@macts/contracts'
import type { TransferLimits } from './limits.js'
import { createTransferStore, type TransferStore } from './store.js'

/** The instant every test clock starts at. */
export const START = new Date('2026-01-15T10:00:00.000Z')

/** Subjects used across the tests. */
export const ALICE = 'key_alice'
export const BOB = 'key_bob'

/** A clock the test moves explicitly. */
export interface TestClock {
  readonly now: () => Date
  /** Move the clock forward (or back, with a negative value) by `ms`. */
  advance(ms: number): void
  /** Set the clock to an absolute instant. */
  set(instant: Date | string): void
}

/** A clock starting at {@link START}. */
export function createTestClock(start: Date = START): TestClock {
  let current = start.getTime()
  return {
    now: () => new Date(current),
    advance(ms) {
      current += ms
    },
    set(instant) {
      current = new Date(instant).getTime()
    },
  }
}

/** A fresh, empty macts home, and a way to open stores on it. */
export interface TransferStoreFixture {
  /** The macts home directory. */
  readonly home: string
  /** The clock every store opened through {@link open} uses. */
  readonly clock: TestClock
  /** The store opened before each test. */
  readonly store: TransferStore
  /** Open another store on the same home and clock (closed after the test). */
  open(limits?: Partial<TransferLimits>): Promise<TransferStore>
}

/**
 * Register hooks that give each test a temp home, a {@link TestClock}, and an
 * open store, and remove them afterwards. Read the returned object's
 * properties inside tests, not at definition time.
 */
export function useTransferStore(limits?: Partial<TransferLimits>): TransferStoreFixture {
  let home = ''
  let clock = createTestClock()
  let store: TransferStore | undefined
  const opened: TransferStore[] = []

  async function open(overrides: Partial<TransferLimits> | undefined = limits) {
    const next = await createTransferStore({
      home,
      now: clock.now,
      ...(overrides === undefined ? {} : { limits: overrides }),
    })
    opened.push(next)
    return next
  }

  beforeEach(async () => {
    home = mkdtempSync(join(tmpdir(), 'macts-transfers-'))
    clock = createTestClock()
    store = await open()
  })

  afterEach(() => {
    for (const each of opened.splice(0)) {
      each.close()
    }
    store = undefined
    rmSync(home, { recursive: true, force: true })
  })

  return {
    get home() {
      return home
    },
    get clock() {
      return clock
    },
    get store() {
      if (store === undefined) {
        throw new Error('The transfer store fixture is only available inside a test.')
      }
      return store
    },
    open,
  }
}

/** An async source yielding each argument as one chunk (strings as UTF-8). */
export async function* chunks(...parts: (string | Uint8Array)[]): AsyncGenerator<Uint8Array> {
  for (const part of parts) {
    await Promise.resolve()
    yield typeof part === 'string' ? new TextEncoder().encode(part) : part
  }
}

/** `count` chunks of `size` bytes each. */
export function filledChunks(count: number, size: number): AsyncGenerator<Uint8Array> {
  return chunks(...Array.from({ length: count }, () => new Uint8Array(size).fill(0x61)))
}

/** The rejection of `promise`; fails the test if it resolves. */
export async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to reject, but it resolved.')
}

/** Assert `promise` rejects with a `TransferError` of `reason`, and return it. */
export async function expectTransferError(
  promise: Promise<unknown>,
  reason: TransferError['details']['reason']
): Promise<TransferError> {
  const error = await rejectionOf(promise)
  expect(error).toBeInstanceOf(TransferError)
  if (!(error instanceof TransferError)) {
    throw error
  }
  expect(error.code).toBe('TRANSFER_FAILED')
  expect(error.details).toEqual({ reason })
  return error
}

/** Assert `promise` rejects with a `RateLimitedError`, and return it. */
export async function expectRateLimited(promise: Promise<unknown>): Promise<RateLimitedError> {
  const error = await rejectionOf(promise)
  expect(error).toBeInstanceOf(RateLimitedError)
  if (!(error instanceof RateLimitedError)) {
    throw error
  }
  return error
}

/**
 * Assert two failures are indistinguishable to a caller: same class, code,
 * details, and message.
 */
export function expectIndistinguishable(a: TransferError, b: TransferError): void {
  expect(a.constructor).toBe(b.constructor)
  expect(a.code).toBe(b.code)
  expect(a.details).toEqual(b.details)
  expect(a.message).toBe(b.message)
}

/** Milliseconds in a minute, for readable clock moves. */
export const MINUTE = 60_000
