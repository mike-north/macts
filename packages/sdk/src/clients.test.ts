/**
 * Tests for createMactsClients() — the main authoring entry point.
 *
 * The primary acceptance criteria (issue #72):
 * - An agent can author a script composing ≥2 operations with key auto-resolved
 * - The composed example type-checks (verified statically by tsc/tsup)
 * - Governance is inherited automatically; a policy-denied op surfaces as error
 *
 * These tests verify the wiring: that each client is instantiated with the
 * correct apiKey and baseUrl (which it will forward on every HTTP call), and
 * that the error path surfaces properly when the key is absent.
 *
 * UAT against a live server requires the daemon to be running locally; that
 * path is covered by the AUTHORING.md example and integration-tested manually.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMactsClients } from './clients.js'
import { DEFAULT_BASE_URL } from './resolve.js'

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
  vi.restoreAllMocks()
})

// ---- helpers ----

function setKey(key: string): void {
  process.env['MACTS_API_KEY'] = key
}

function clearKey(): void {
  delete process.env['MACTS_API_KEY']
}

/** Synchronous JSON mock that avoids the @typescript-eslint/require-await error. */
function jsonMock(value: unknown): () => Promise<unknown> {
  return () => Promise.resolve(value)
}

/** Build a mock fetch Response that returns value as the JSON body. */
function okResponse(value: unknown): Response {
  return {
    ok: true,
    json: jsonMock({ result: value }),
  } as unknown as Response
}

/** Build a mock fetch Response that returns an API error. */
function errResponse(code: string, message: string): Response {
  return {
    ok: false,
    status: 403,
    json: jsonMock({ error: { code, message } }),
  } as unknown as Response
}

// ---- tests ----

describe('createMactsClients()', () => {
  describe('happy path — returns typed clients', () => {
    it('returns an object with a calendar client', () => {
      setKey('macts_sk_test')
      const m = createMactsClients()
      expect(m.calendar).toBeDefined()
      expect(typeof m.calendar.calendars.list).toBe('function')
      expect(typeof m.calendar.events.create).toBe('function')
    })

    it('returns an object with a reminders client', () => {
      setKey('macts_sk_test')
      const m = createMactsClients()
      expect(m.reminders).toBeDefined()
      expect(typeof m.reminders.lists.list).toBe('function')
      expect(typeof m.reminders.reminders.create).toBe('function')
    })

    it('returns all expected app clients', () => {
      setKey('macts_sk_test')
      const m = createMactsClients()
      const expectedKeys: (keyof typeof m)[] = [
        'alfred',
        'arc',
        'automator',
        'bluetoothFileExchange',
        'calendar',
        'console',
        'contacts',
        'finder',
        'googleChrome',
        'iterm',
        'mail',
        'messages',
        'microsoftEdge',
        'microsoftWord',
        'music',
        'notes',
        'omnifocus',
        'omnigraffle',
        'omniplan',
        'photos',
        'preview',
        'quicktimePlayer',
        'reminders',
        'safari',
        'screenSharing',
        'scriptEditor',
        'shortcuts',
        'spotify',
        'systemEvents',
        'systemInformation',
        'systemSettings',
        'terminal',
        'textedit',
        'tv',
        'xcode',
      ]
      for (const key of expectedKeys) {
        expect(m[key], `expected client '${key}' to be present`).toBeDefined()
      }
    })

    it('all clients use the same resolved API key', () => {
      setKey('macts_sk_shared_key')
      delete process.env['MACTS_API_URL']

      // Spy on fetch to capture the Authorization header sent by each client.
      // Calling m.calendar.calendars.list() and m.reminders.lists.list() both
      // trigger fetch; both should carry the same bearer token.
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse([]))

      const m = createMactsClients()
      // Kick off two calls without awaiting — we only need to see the headers.
      void m.calendar.calendars.list()
      void m.reminders.lists.list()

      const calls = fetchSpy.mock.calls
      expect(calls.length).toBeGreaterThanOrEqual(2)
      for (const [, init] of calls) {
        const headers = init?.headers as Record<string, string>
        expect(headers['Authorization']).toBe('Bearer macts_sk_shared_key')
      }
    })

    it('all clients use the default base URL when MACTS_API_URL is unset', () => {
      setKey('macts_sk_test')
      delete process.env['MACTS_API_URL']

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse([]))

      const m = createMactsClients()
      void m.calendar.calendars.list()

      const [urlArg] = fetchSpy.mock.calls[0] ?? []
      // urlArg is a string (the clients construct the URL as a string literal)
      expect(urlArg).toSatisfy(
        (u: unknown) => typeof u === 'string' && u.includes(DEFAULT_BASE_URL)
      )
    })

    it('all clients use a custom base URL when MACTS_API_URL is set', () => {
      setKey('macts_sk_test')
      process.env['MACTS_API_URL'] = 'http://custom-host:9999'

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse([]))

      const m = createMactsClients()
      void m.notes.notes.list()

      const [urlArg] = fetchSpy.mock.calls[0] ?? []
      expect(urlArg).toSatisfy(
        (u: unknown) => typeof u === 'string' && u.includes('http://custom-host:9999')
      )
    })
  })

  describe('error path — missing API key', () => {
    it('throws when MACTS_API_KEY is not set', () => {
      clearKey()
      expect(() => createMactsClients()).toThrow('MACTS_API_KEY environment variable is required')
    })

    it('throws when MACTS_API_KEY is an empty string', () => {
      setKey('')
      expect(() => createMactsClients()).toThrow('MACTS_API_KEY environment variable is required')
    })

    it('throws when MACTS_API_KEY is whitespace-only', () => {
      setKey('   ')
      expect(() => createMactsClients()).toThrow('MACTS_API_KEY environment variable is required')
    })
  })

  describe('governance surface — error propagation', () => {
    it('surfaces a governance-denied error from the calendar client', async () => {
      setKey('macts_sk_test')

      // Simulate the server returning a GOVERNANCE_DENIED response — the same
      // shape the API server sends when the active policy blocks the operation.
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        errResponse('GOVERNANCE_DENIED', 'Operation denied by active policy')
      )

      const m = createMactsClients()
      await expect(m.calendar.calendars.list()).rejects.toThrow('Operation denied by active policy')
    })

    it('surfaces a PERMISSION_DENIED error from the reminders client', async () => {
      setKey('macts_sk_test')

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        errResponse('PERMISSION_DENIED', 'API key lacks required permission')
      )

      const m = createMactsClients()
      await expect(m.reminders.lists.list()).rejects.toThrow('API key lacks required permission')
    })
  })

  describe('multi-op composition — criterion 1 coverage', () => {
    it('composes ≥2 operations across calendar and reminders', async () => {
      setKey('macts_sk_test')

      const mockCalendars = [{ id: 'cal-1', name: 'Work', color: '#FF0000', writable: true }]
      const mockLists = [{ id: 'list-1', name: 'Inbox', color: { r: 0, g: 0, b: 0 }, emblem: '' }]
      const mockReminder = {
        id: 'rem-1',
        name: 'Review Work calendar',
        body: '',
        completed: false,
        priority: 0,
        listId: 'list-1',
      }

      const responses = [okResponse(mockCalendars), okResponse(mockLists), okResponse(mockReminder)]
      let callCount = 0
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        const resp = responses[callCount++]
        return Promise.resolve(resp ?? okResponse([]))
      })

      const m = createMactsClients()

      // Op 1: list calendars
      const calendars = await m.calendar.calendars.list()
      expect(calendars).toEqual(mockCalendars)

      // Op 2: list reminder lists
      const lists = await m.reminders.lists.list()
      expect(lists).toEqual(mockLists)

      // Op 3: create a reminder referencing data from op 1
      const reminder = await m.reminders.reminders.create({
        name: `Review: ${calendars[0]?.name ?? 'calendar'}`,
        listId: lists[0]?.id ?? '',
      })
      expect(reminder).toEqual(mockReminder)

      // Verify all 3 calls were made through the governed API
      expect(callCount).toBe(3)
    })
  })
})
