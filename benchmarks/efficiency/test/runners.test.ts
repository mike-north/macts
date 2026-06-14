/**
 * Tests for the runner seam.
 *
 * The real runners CANNOT execute against a live Mac in CI, but their
 * dependency-injected logic IS unit-testable: with fakes we verify the
 * raw path's loop accounting and the macts path's single-turn composition.
 * Without deps, both must fail fast with a LiveEnvironmentError so the harness
 * records a clean failure. Live-config resolution is checked for its negative
 * (missing-credential) path. Expected values are hand-derived from the
 * accounting rules in the runner sources.
 */

import { describe, expect, it } from 'vitest'
import { MactsRunner } from '../src/runners/macts.js'
import { RawComputerUseRunner } from '../src/runners/raw-computer-use.js'
import { ENV, LiveEnvironmentError, resolveLiveConfig } from '../src/runners/environment.js'
import type { LiveConfig } from '../src/runners/environment.js'
import type { ModelDriver } from '../src/runners/agent.js'
import type { ComposedScript } from '../src/runners/macts.js'
import type { RunContext, TaskDefinition } from '../src/types.js'

function task(id = 't1'): TaskDefinition {
  return {
    id,
    intent: 'intent',
    apps: ['com.apple.iCal'],
    operationClass: 'write',
    mactsCapabilities: ['calendar.events.create'],
  }
}

function context(maxRetries = 2): RunContext {
  return { task: task(), maxRetries }
}

const LIVE_CONFIG: LiveConfig = {
  modelApiKey: 'model-key',
  mactsBaseUrl: 'http://localhost:8372',
  mactsApiKey: 'macts-key',
}

describe('resolveLiveConfig', () => {
  it('resolves when all required vars are present, defaulting the base URL', () => {
    const config = resolveLiveConfig({
      [ENV.modelApiKey]: 'm',
      [ENV.mactsApiKey]: 'a',
    })
    expect(config.mactsBaseUrl).toBe('http://localhost:8372')
  })

  // Negative: missing credentials must list every gap at once.
  it('throws LiveEnvironmentError naming every missing variable', () => {
    expect(() => resolveLiveConfig({})).toThrow(LiveEnvironmentError)
    try {
      resolveLiveConfig({})
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain(ENV.modelApiKey)
      expect(message).toContain(ENV.mactsApiKey)
    }
  })
})

describe('RawComputerUseRunner', () => {
  // Without deps it must throw so the harness records a clean live-env failure.
  it('throws LiveEnvironmentError when constructed without live deps', async () => {
    await expect(new RawComputerUseRunner().run(context())).rejects.toBeInstanceOf(
      LiveEnvironmentError
    )
  })

  it('meters one turn per screenshot/act cycle and stops when the model is done', async () => {
    // Model: turn 1 emits an action, turn 2 signals done. 2 turns total.
    const steps: Awaited<ReturnType<ModelDriver['step']>>[] = [
      { usage: { inputTokens: 500, outputTokens: 100 }, done: false, action: 'click 10,20' },
      { usage: { inputTokens: 400, outputTokens: 50 }, done: true },
    ]
    const doneStep: Awaited<ReturnType<ModelDriver['step']>> = {
      usage: { inputTokens: 0, outputTokens: 0 },
      done: true,
    }
    let i = 0
    const driver: ModelDriver = {
      step: () => Promise.resolve(steps[i++] ?? doneStep),
    }
    const performed: string[] = []
    const screen = {
      screenshot: () => Promise.resolve('pixels'),
      perform: (action: string) => {
        performed.push(action)
        return Promise.resolve()
      },
    }

    const runner = new RawComputerUseRunner({ driver, screen, maxTurns: 40 })
    const { metrics } = await runner.run(context())

    expect(metrics.success).toBe(true)
    expect(metrics.turns).toBe(2) // two model round-trips
    expect(metrics.totalTokens).toBe(1050) // 600 + 450
    expect(performed).toEqual(['click 10,20'])
  })

  it('fails (no success) when the turn budget is exhausted without completion', async () => {
    const driver: ModelDriver = {
      step: () =>
        Promise.resolve({
          usage: { inputTokens: 100, outputTokens: 10 },
          done: false,
          action: 'click',
        }),
    }
    const screen = {
      screenshot: () => Promise.resolve('pixels'),
      perform: () => Promise.resolve(),
    }
    const runner = new RawComputerUseRunner({ driver, screen, maxTurns: 3 })
    const { metrics } = await runner.run(context())

    expect(metrics.success).toBe(false)
    expect(metrics.turns).toBe(3) // capped
  })
})

describe('MactsRunner', () => {
  const planningUsage = { inputTokens: 700, outputTokens: 80 }

  it('throws LiveEnvironmentError when constructed without live deps', async () => {
    await expect(new MactsRunner().run(context())).rejects.toBeInstanceOf(LiveEnvironmentError)
  })

  it('completes in a single model turn (code-mode collapses N operations)', async () => {
    let scriptCalls = 0
    const script: ComposedScript = () => {
      scriptCalls++
      return Promise.resolve({ success: true })
    }
    const runner = new MactsRunner({
      config: LIVE_CONFIG,
      scripts: new Map([['t1', script]]),
      planningUsage,
    })

    const { metrics } = await runner.run(context())

    expect(metrics.success).toBe(true)
    expect(metrics.turns).toBe(1) // ONE round-trip, regardless of op count
    expect(metrics.totalTokens).toBe(780) // 700 + 80, the single planning turn
    expect(scriptCalls).toBe(1)
  })

  // Negative: a task without an authored composed script is a config failure.
  it('fails without retries when no script is registered for the task', async () => {
    const runner = new MactsRunner({
      config: LIVE_CONFIG,
      scripts: new Map(),
      planningUsage,
    })
    const { metrics, failureReason } = await runner.run(context())
    expect(metrics.success).toBe(false)
    expect(metrics.retries).toBe(0)
    expect(metrics.turns).toBe(1) // the planning turn still counts
    // The runner surfaces a diagnostic rather than a generic harness message.
    expect(failureReason).toContain('t1')
  })

  // The composed script may fail transiently; the runner retries to the bound.
  it('retries a failing script up to maxRetries then gives up', async () => {
    let attempts = 0
    const script: ComposedScript = () => {
      attempts++
      return Promise.resolve({ success: false, reason: 'event not found' })
    }
    const runner = new MactsRunner({
      config: LIVE_CONFIG,
      scripts: new Map([['t1', script]]),
      planningUsage,
    })
    const { metrics, failureReason } = await runner.run(context(2))

    expect(metrics.success).toBe(false)
    expect(metrics.retries).toBe(2)
    expect(attempts).toBe(3) // initial + 2 retries
    // The last script reason is propagated so the report is actionable.
    expect(failureReason).toBe('event not found')
  })

  it('succeeds on a retry after a transient failure', async () => {
    let attempts = 0
    const script: ComposedScript = () => {
      attempts++
      return Promise.resolve(attempts === 1 ? { success: false } : { success: true })
    }
    const runner = new MactsRunner({
      config: LIVE_CONFIG,
      scripts: new Map([['t1', script]]),
      planningUsage,
    })
    const { metrics, failureReason } = await runner.run(context(2))

    expect(metrics.success).toBe(true)
    expect(metrics.retries).toBe(1)
    expect(attempts).toBe(2)
    expect(failureReason).toBeUndefined()
  })
})
