/**
 * Telemetry instrumentation for the macts API.
 *
 * Exposes OpenTelemetry-shaped tracing interfaces ({@link Tracer}, {@link Span},
 * {@link SpanStatusCode}), but no tracing actually happens: no OpenTelemetry
 * package is required, read, or integrated with, and spans discard everything
 * recorded on them. What that means differs per export:
 *
 * - {@link configureTelemetry} does nothing at all.
 * - {@link getTracer} returns a tracer whose spans accept every call and
 *   retain none of it.
 * - {@link withSpan} is **not** a no-op. It invokes the callback, awaits and
 *   returns its result, rethrows if it throws, and always ends the span — only
 *   the span's recording is inert. Real code can be wrapped in it today and
 *   will behave exactly as it does uninstrumented.
 *
 * This module exists so callers can code against the eventual tracing API
 * shape ahead of time.
 *
 * @packageDocumentation
 */

/**
 * Span status codes following the OpenTelemetry specification.
 */
export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
} as const

/**
 * Span status code type.
 */
export type SpanStatusCodeValue = (typeof SpanStatusCode)[keyof typeof SpanStatusCode]

/**
 * Span attribute value types.
 */
export type AttributeValue = string | number | boolean

/**
 * Minimal span interface compatible with OpenTelemetry Span.
 */
export interface Span {
  /** Set an attribute on the span. */
  setAttribute(key: string, value: AttributeValue): this
  /** Set the span status. */
  setStatus(status: { code: SpanStatusCodeValue; message?: string }): this
  /** Record an exception on the span. */
  recordException(exception: Error | string): void
  /** End the span. */
  end(): void
}

/**
 * Minimal tracer interface compatible with OpenTelemetry Tracer.
 */
export interface Tracer {
  /** Start a new span. */
  startSpan(name: string, options?: { attributes?: Record<string, AttributeValue> }): Span
}

/**
 * No-op span implementation. All methods are safe to call but do nothing.
 */
class NoopSpan implements Span {
  setAttribute(_key: string, _value: AttributeValue): this {
    return this
  }

  setStatus(_status: { code: SpanStatusCodeValue; message?: string }): this {
    return this
  }

  recordException(_exception: Error | string): void {
    // no-op
  }

  end(): void {
    // no-op
  }
}

/**
 * No-op tracer implementation. Returns no-op spans.
 */
class NoopTracer implements Tracer {
  startSpan(_name: string, _options?: { attributes?: Record<string, AttributeValue> }): Span {
    return new NoopSpan()
  }
}

const noopTracer = new NoopTracer()

/**
 * Get a tracer instance.
 *
 * Always returns a no-op tracer. Tracing is not yet implemented, and calling
 * {@link configureTelemetry} does not change this.
 *
 * @param _name - Tracer name (used as instrumentation scope name)
 * @returns A tracer instance
 *
 * @example
 * ```typescript
 * import { getTracer } from '@macts/api/telemetry';
 *
 * const tracer = getTracer('my-service');
 * const span = tracer.startSpan('operation');
 * try {
 *   // ... do work
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } catch (err) {
 *   span.recordException(err);
 *   span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
 *   throw err;
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function getTracer(_name?: string): Tracer {
  return noopTracer
}

/**
 * Execute an async function within a traced span.
 *
 * Automatically handles span lifecycle: creates the span before execution,
 * records errors if the function throws, sets appropriate status, and
 * ends the span when complete.
 *
 * @param name - Span name
 * @param fn - Async function to execute within the span
 * @param attributes - Optional span attributes
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * import { withSpan } from '@macts/api/telemetry';
 *
 * const result = await withSpan('db.query', async (span) => {
 *   span.setAttribute('db.statement', 'SELECT ...');
 *   return await db.query('SELECT ...');
 * });
 * ```
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, AttributeValue>
): Promise<T> {
  const tracer = getTracer('macts-api')
  const span = tracer.startSpan(name, attributes ? { attributes } : undefined)

  try {
    const result = await fn(span)
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    if (error instanceof Error) {
      span.recordException(error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
    } else {
      span.recordException(String(error))
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) })
    }
    throw error
  } finally {
    span.end()
  }
}

/**
 * Telemetry configuration options.
 */
export interface TelemetryOptions {
  /** Service name for traces (default: 'macts-api') */
  serviceName?: string
  /** OTLP endpoint URL (default: 'http://localhost:4318') */
  endpoint?: string
}

/**
 * Configure OpenTelemetry tracing.
 *
 * This is currently a no-op stub. Tracing is not yet implemented: calling
 * this function has no effect, does not install or require any
 * `@opentelemetry/*` package, and does not change what {@link getTracer}
 * returns. It exists only to reserve the public API shape for a future
 * tracing implementation.
 *
 * @param _options - Telemetry configuration (currently unused)
 */
export function configureTelemetry(_options: TelemetryOptions = {}): void {
  // No-op stub: tracing is not yet implemented. This function intentionally
  // does nothing. See the module-level doc comment for details.
}
