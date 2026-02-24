/**
 * Tests for telemetry module.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest'
import {
  getTracer,
  withSpan,
  configureTelemetry,
  SpanStatusCode,
  type Span,
  type Tracer,
} from './telemetry.js'

describe('getTracer', () => {
  it('should return a tracer instance', () => {
    const tracer = getTracer('test')
    expect(tracer).toBeDefined()
    expect(typeof tracer.startSpan).toBe('function')
  })

  it('should return a tracer without a name argument', () => {
    const tracer = getTracer()
    expect(tracer).toBeDefined()
  })

  it('should return the same no-op tracer for different names', () => {
    const tracer1 = getTracer('service-a')
    const tracer2 = getTracer('service-b')
    expect(tracer1).toBe(tracer2)
  })
})

describe('NoopTracer / NoopSpan', () => {
  let tracer: Tracer

  it('should create spans that do not throw', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span')
    expect(span).toBeDefined()
  })

  it('should allow setting attributes without error', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span')
    const result = span.setAttribute('key', 'value')
    expect(result).toBe(span) // should return this for chaining
  })

  it('should allow setting status without error', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span')
    const result = span.setStatus({ code: SpanStatusCode.OK })
    expect(result).toBe(span)
  })

  it('should allow recording exceptions without error', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span')
    expect(() => {
      span.recordException(new Error('test error'))
    }).not.toThrow()
  })

  it('should allow recording string exceptions without error', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span')
    expect(() => {
      span.recordException('string error')
    }).not.toThrow()
  })

  it('should allow ending spans without error', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span')
    expect(() => {
      span.end()
    }).not.toThrow()
  })

  it('should support chaining setAttribute calls', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span')
    const result = span
      .setAttribute('key1', 'value1')
      .setAttribute('key2', 42)
      .setAttribute('key3', true)
    expect(result).toBe(span)
  })

  it('should accept attributes in startSpan options', () => {
    tracer = getTracer('test')
    const span = tracer.startSpan('test-span', {
      attributes: { 'app.name': 'calendar', 'rpc.method': 'events.list' },
    })
    expect(span).toBeDefined()
  })
})

describe('withSpan', () => {
  it('should execute the function and return its result', async () => {
    const result = await withSpan('test-op', (_span) => {
      return 42
    })
    expect(result).toBe(42)
  })

  it('should pass a span to the function', async () => {
    let capturedSpan: Span | undefined
    await withSpan('test-op', (span) => {
      capturedSpan = span
      return null
    })
    expect(capturedSpan).toBeDefined()
    expect(typeof capturedSpan?.setAttribute).toBe('function')
    expect(typeof capturedSpan?.setStatus).toBe('function')
    expect(typeof capturedSpan?.end).toBe('function')
  })

  it('should pass attributes to the span', async () => {
    // No-op tracer ignores attributes, but should not throw
    const result = await withSpan('test-op', (_span) => 'done', { 'custom.attr': 'value' })
    expect(result).toBe('done')
  })

  it('should re-throw errors from the wrapped function', async () => {
    const error = new Error('test failure')
    await expect(
      withSpan('failing-op', () => {
        throw error
      })
    ).rejects.toThrow('test failure')
  })

  it('should re-throw non-Error exceptions', async () => {
    await expect(
      withSpan('failing-op', () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'string error'
      })
    ).rejects.toBe('string error')
  })

  it('should handle async operations correctly', async () => {
    const result = await withSpan('async-op', async (_span) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 10)
      })
      return 'async-result'
    })
    expect(result).toBe('async-result')
  })
})

describe('configureTelemetry', () => {
  it('should not throw when called without options', () => {
    expect(() => {
      configureTelemetry()
    }).not.toThrow()
  })

  it('should not throw when called with options', () => {
    expect(() => {
      configureTelemetry({
        serviceName: 'test-service',
        endpoint: 'http://localhost:4318',
      })
    }).not.toThrow()
  })
})

describe('SpanStatusCode', () => {
  it('should have UNSET = 0', () => {
    expect(SpanStatusCode.UNSET).toBe(0)
  })

  it('should have OK = 1', () => {
    expect(SpanStatusCode.OK).toBe(1)
  })

  it('should have ERROR = 2', () => {
    expect(SpanStatusCode.ERROR).toBe(2)
  })
})
