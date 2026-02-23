/**
 * Telemetry instrumentation for the macts API.
 *
 * Provides OpenTelemetry-compatible tracing interfaces. Without an OTel SDK
 * installed, all operations are no-ops. When `@opentelemetry/api` becomes
 * available, swap the internal implementations to use the real API.
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
 * Returns a no-op tracer by default. When an OpenTelemetry SDK is configured
 * via {@link configureTelemetry}, returns an instrumented tracer.
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
 * This is a placeholder for future integration with `@opentelemetry/sdk-node`.
 * When the SDK packages are available, this function will initialize the
 * trace provider and configure the OTLP exporter.
 *
 * Currently a no-op that logs a message indicating telemetry is not configured.
 *
 * @param _options - Telemetry configuration
 *
 * @example
 * ```typescript
 * import { configureTelemetry } from '@macts/api/telemetry';
 *
 * // When @opentelemetry/sdk-node is installed:
 * await configureTelemetry({
 *   serviceName: 'macts-api',
 *   endpoint: 'http://localhost:4318',
 * });
 * ```
 */
export function configureTelemetry(_options: TelemetryOptions = {}): void {
  // No-op: @opentelemetry/sdk-node is not available in this environment.
  // When the SDK packages become available, this will be implemented to
  // initialize NodeTracerProvider with OTLP exporter.
}
