/**
 * Tests for API key and base-URL resolution.
 *
 * Resolution strategy mirrors `@macts/<app>/cli` SDK helpers and
 * `getMactsHome()` in `@macts/api/paths`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_BASE_URL,
  resolveApiKey,
  resolveBaseUrl,
  resolveConnectionOptions,
} from './resolve.js'

// ---- env isolation ----

let savedApiKey: string | undefined
let savedApiUrl: string | undefined

beforeEach(() => {
  savedApiKey = process.env['MACTS_API_KEY']
  savedApiUrl = process.env['MACTS_API_URL']
})

afterEach(() => {
  if (savedApiKey === undefined) {
    delete process.env['MACTS_API_KEY']
  } else {
    process.env['MACTS_API_KEY'] = savedApiKey
  }
  if (savedApiUrl === undefined) {
    delete process.env['MACTS_API_URL']
  } else {
    process.env['MACTS_API_URL'] = savedApiUrl
  }
})

// ---- tests ----

describe('resolveApiKey', () => {
  it('returns the key when MACTS_API_KEY is set', () => {
    process.env['MACTS_API_KEY'] = 'macts_sk_test123'
    expect(resolveApiKey()).toBe('macts_sk_test123')
  })

  it('throws when MACTS_API_KEY is not set', () => {
    delete process.env['MACTS_API_KEY']
    expect(() => resolveApiKey()).toThrow('MACTS_API_KEY environment variable is required')
  })

  it('throws when MACTS_API_KEY is an empty string', () => {
    process.env['MACTS_API_KEY'] = ''
    expect(() => resolveApiKey()).toThrow('MACTS_API_KEY environment variable is required')
  })

  it('throws when MACTS_API_KEY is whitespace-only', () => {
    process.env['MACTS_API_KEY'] = '   '
    expect(() => resolveApiKey()).toThrow('MACTS_API_KEY environment variable is required')
  })

  it('trims leading/trailing whitespace from the key', () => {
    process.env['MACTS_API_KEY'] = '  macts_sk_trimmed  '
    expect(resolveApiKey()).toBe('macts_sk_trimmed')
  })

  it('error message includes actionable instructions', () => {
    delete process.env['MACTS_API_KEY']
    expect(() => resolveApiKey()).toThrow('macts api-key create')
  })
})

describe('resolveBaseUrl', () => {
  it('returns the default URL when MACTS_API_URL is not set', () => {
    delete process.env['MACTS_API_URL']
    expect(resolveBaseUrl()).toBe(DEFAULT_BASE_URL)
  })

  it('returns the default URL when MACTS_API_URL is empty', () => {
    process.env['MACTS_API_URL'] = ''
    expect(resolveBaseUrl()).toBe(DEFAULT_BASE_URL)
  })

  it('returns the default URL when MACTS_API_URL is whitespace-only', () => {
    process.env['MACTS_API_URL'] = '   '
    expect(resolveBaseUrl()).toBe(DEFAULT_BASE_URL)
  })

  it('returns the custom URL when MACTS_API_URL is set', () => {
    process.env['MACTS_API_URL'] = 'http://localhost:9999'
    expect(resolveBaseUrl()).toBe('http://localhost:9999')
  })

  it('strips a trailing slash from the custom URL', () => {
    process.env['MACTS_API_URL'] = 'http://localhost:9999/'
    expect(resolveBaseUrl()).toBe('http://localhost:9999')
  })

  it('DEFAULT_BASE_URL constant is the well-known local address', () => {
    // Spec: the local macts daemon listens on port 8372 by default.
    expect(DEFAULT_BASE_URL).toBe('http://localhost:8372')
  })
})

describe('resolveConnectionOptions', () => {
  it('returns apiKey and baseUrl together', () => {
    process.env['MACTS_API_KEY'] = 'macts_sk_abc'
    process.env['MACTS_API_URL'] = 'http://custom:1234'
    const opts = resolveConnectionOptions()
    expect(opts.apiKey).toBe('macts_sk_abc')
    expect(opts.baseUrl).toBe('http://custom:1234')
  })

  it('uses default base URL when MACTS_API_URL is not set', () => {
    process.env['MACTS_API_KEY'] = 'macts_sk_abc'
    delete process.env['MACTS_API_URL']
    const opts = resolveConnectionOptions()
    expect(opts.baseUrl).toBe(DEFAULT_BASE_URL)
  })

  it('throws when MACTS_API_KEY is missing', () => {
    delete process.env['MACTS_API_KEY']
    expect(() => resolveConnectionOptions()).toThrow(
      'MACTS_API_KEY environment variable is required'
    )
  })
})
