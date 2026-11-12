/**
 * Calendar color boundaries through the generated contract and local SDK.
 * Only the process transport is replaced; invocation planning, codec, schemas,
 * and canonical errors run unchanged. Expected channels follow the 16-bit RGB
 * contract and Calendar's normalized interface, independently of read-back.
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import { calendarContract } from '@macts/calendar/contract'
import { Integer, UnexpectedValueError, ValidationError } from '@macts/contracts'
import { createNativeExecutor, type NativeOutcome, type NativeScript } from '@macts/core'
import { standInTransport } from '@macts/core/testing'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local.js'

// Key storage reads its home at import time; isolate test credentials first.
const { home } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-calendar-color-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { home }
})
setLogger(createLogger({ level: 'silent' }))
afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(home, { recursive: true, force: true })
})

/** A single Calendar property record; no real app is contacted. */
function calendarRecord(color: unknown): Record<string, unknown> {
  return { name: 'Work', title: 'Work', color, writable: true, description: '' }
}

/**
 * The stand-in exposes property reads, whole-collection reads, and creation.
 * Writes are captured before read-back so read and write conversions cannot
 * conceal one another's errors.
 */
async function fixture(color: unknown) {
  const writes: unknown[] = []
  const scripts: NativeScript[] = []
  const outcomes: NativeOutcome[] = []
  const record = calendarRecord(color)
  const calendar = {
    exists: () => true,
    properties: () => record,
    name: () => record['name'],
    title: () => record['title'],
    color: () => record['color'],
    writable: () => record['writable'],
    description: () => record['description'],
  }
  const calendars = Object.assign(() => [calendar], {
    whose: () => [calendar],
    properties: () => [record],
  })
  const transport = standInTransport(
    {
      calendars,
      Calendar: (properties: Record<string, unknown>) => {
        writes.push(properties)
        return {
          ...calendar,
          make: () => undefined,
          color: () => properties['color'],
          properties: () => ({ ...record, ...properties }),
        }
      },
    },
    scripts
  )
  const key = await createApiKey({
    name: 'Calendar color',
    permissions: ['calendar:calendars:get', 'calendar:calendars:list', 'calendar:calendars:create'],
  })
  const client = createClient(calendarContract, {
    token: key.token,
    governance: { policy: ALLOW_ALL_POLICY },
    executor: createNativeExecutor({
      transport: {
        async run(script, options) {
          const outcome = await transport.run(script, options)
          outcomes.push(outcome)
          return outcome
        },
      },
    }),
  })
  return { client, writes, scripts, outcomes }
}

describe('Calendar normalized color interface', () => {
  it('declares the bridge form in the generated manifest', async () => {
    const manifest = await calendarContract.loadManifest()
    expect(manifest).toMatchObject({ app: { rgbChannels: 'normalized' } })
  })

  it('reads fractions as explicit 16-bit wire channels and SDK integers', async () => {
    const { client, outcomes } = await fixture([0.25, 0.5, 1])
    const result = await client.calendars.get('Work')
    expect(result.color).toEqual({ r: 16384, g: 32768, b: 65535 })
    expect(outcomes[0]).toMatchObject({
      ok: true,
      value: {
        color: { r: { integer: '16384' }, g: { integer: '32768' }, b: { integer: '65535' } },
      },
    })
  })

  it('lists the endpoint and midpoint colors in the SDK', async () => {
    const { client } = await fixture([0, 1, 0.5])
    expect((await client.calendars.list()).items.map((item) => item.color)).toEqual([
      { r: 0, g: 65535, b: 32768 },
    ])
  })

  it('writes SDK integers as wire integers and native fractions', async () => {
    const { client, writes, scripts } = await fixture([0, 0, 0])
    await client.calendars.create({
      name: 'Work',
      color: {
        r: Integer.validate(0),
        g: Integer.validate(65535),
        b: Integer.validate(32768),
      },
    })
    expect(scripts[0]?.input).toMatchObject({
      color: {
        r: { integer: '0' },
        g: { integer: '65535' },
        b: { integer: '32768' },
      },
    })
    expect(writes).toEqual([{ name: 'Work', color: [0, 1, 32768 / 65535] }])
  })

  it.each([-0.01, 1.01, 65535, NaN, Infinity, '0.5', null, undefined])(
    'rejects malformed or out-of-range native channel %s with the canonical error',
    async (channel) => {
      const { client } = await fixture([0, channel, 1])
      await expect(client.calendars.get('Work')).rejects.toBeInstanceOf(UnexpectedValueError)
      await expect(client.calendars.get('Work')).rejects.toMatchObject({ code: 'UNEXPECTED_VALUE' })
    }
  )

  it.each([-1, 65536, 0.5, NaN, Infinity, '1', null, undefined])(
    'rejects invalid SDK channel %s before any transport call',
    async (channel) => {
      const { client, scripts, writes } = await fixture([0, 0, 0])
      // Reflect supplies deliberately invalid runtime input without a branding assertion.
      await expect(
        Reflect.apply(client.calendars.create.bind(client.calendars), undefined, [
          {
            name: 'Work',
            color: { r: channel, g: 0, b: 0 },
          },
        ])
      ).rejects.toBeInstanceOf(ValidationError)
      expect(scripts).toEqual([])
      expect(writes).toEqual([])
    }
  )
})
