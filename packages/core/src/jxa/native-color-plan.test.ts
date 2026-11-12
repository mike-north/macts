/**
 * Per-app RGB invocation data remains separate from provider-neutral value
 * plans, on ordinary operations and reference reads. Stand-in transports run
 * the composed script without contacting an app.
 */
import { fileURLToPath } from 'node:url'
import { ValueTypes as t } from '@macts/contracts'
import { describe, expect, it } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import { createNativeExecutor } from './native-executor.js'
import { standInTransport } from './test-support/stand-in-app.js'

/** A minimal result projection for checking the app's native color. */
const outputPlan = t.record({ color: t.rgb() }).plan

/** A stand-in calendar reached by the name lookup the manifest declares. */
function appWithColor(color: readonly number[]): object {
  const item = {
    exists: () => true,
    name: () => 'Work',
    title: () => 'Work',
    color: () => color,
    writable: () => true,
    description: () => '',
  }
  return { calendars: { whose: () => [item] } }
}

const manifestPath = fileURLToPath(
  new URL('../../../../manifests/calendar/app.yaml', import.meta.url)
)

describe('per-app RGB invocation plan', () => {
  it('keeps a non-Calendar app on integer channels when no normalized interface is declared', async () => {
    const calendar = await loadManifest(manifestPath)
    const { rgbChannels: _rgbChannels, ...metadata } = calendar.app
    const manifest = {
      ...calendar,
      app: { ...metadata, bundleId: 'com.example.integer-colors', name: 'IntegerColors' },
    }
    const executor = createNativeExecutor({
      transport: standInTransport(appWithColor([65535, 32768, 1])),
    })
    expect(
      await executor.execute({
        manifest,
        target: { command: 'get', resource: 'Calendar' },
        input: { id: 'Work' },
        inputPlan: t.record({ id: t.string() }).plan,
        outputPlan,
        resourcePlans: {},
      })
    ).toEqual({ color: { r: { integer: '65535' }, g: { integer: '32768' }, b: { integer: '1' } } })
  })

  it('carries Calendar normalization into reference resolution too', async () => {
    const manifest = await loadManifest(manifestPath)
    const executor = createNativeExecutor({
      transport: standInTransport(appWithColor([0, 0.5, 1])),
    })
    expect(
      await executor.resolve({
        manifest,
        reference: { resource: 'Calendar', form: 'identity', cardinality: 'one', id: 'Work' },
        outputPlan,
        resourcePlans: { Calendar: { id: { kind: 'string' } } },
      })
    ).toEqual({ color: { r: { integer: '0' }, g: { integer: '32768' }, b: { integer: '65535' } } })
  })
})
