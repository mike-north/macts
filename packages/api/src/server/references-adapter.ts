/**
 * The remote reference-resolution route: `POST /resolve`, which the macts
 * server mounts at `/references/v1`.
 *
 * Reference resolution is not an RPC operation, so it lives in its own
 * top-level namespace beside `/api/v1`, never under it (phases/13 D7). The
 * route is a pure transport over `MactsRuntime.resolveReference`: it checks
 * only the framing of the request body, then hands the app and the reference
 * to the runtime, which runs the full invocation pipeline as the referenced
 * resource's `get` or `list` operation (phases/13 D5, D7). Every other
 * protocol concern (the invocation context, the per-client-address limit,
 * the success envelope, and the D6 error mapping) is shared with the RPC
 * routes, in `./call-protocol.ts`.
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { ValidationError, type ValidationIssue } from '@macts/contracts'
import type { MactsRuntime } from '@macts/runtime'
import { withSpan } from '../telemetry.js'
import {
  createCallTransport,
  failureResponse,
  notFoundResponse,
  serveRuntimeCall,
  type HttpAdapterOptions,
} from './call-protocol.js'

/**
 * The body of `POST /references/v1/resolve`.
 *
 * @remarks
 * `reference` is the reference control record exactly as encoding a reference
 * produces it (`{"reference": {…}}`, phases/13 D7), validated by the runtime
 * against the app contract's resource table.
 */
export interface ResolveReferenceRequest {
  /** The app's route segment, as its contract names it (for example `'notes'`). */
  readonly app: string
  /** The reference in wire form: the `{"reference": …}` control record. */
  readonly reference: unknown
}

/** Whether `value` is a plain JSON object (not `null`, not an array). */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The resolution request a parsed body denotes.
 *
 * @remarks
 * A framing check only, like refusing a body that is not JSON (phases/13 D6):
 * it establishes which app the call is for and that a reference is present,
 * and nothing about the reference itself. Everything else is the runtime's to
 * judge, after it has verified the caller.
 *
 * @throws `ValidationError` naming each missing or mistyped field when the body
 *   is not an object with a string `app` and a `reference`.
 */
function readResolveRequest(body: unknown): ResolveReferenceRequest {
  if (!isRecord(body)) {
    throw new ValidationError('Request body must be a JSON object', {
      issues: [{ path: [], message: 'Expected an object with a string "app" and a "reference"' }],
    })
  }
  const issues: ValidationIssue[] = []
  const app = body['app']
  if (typeof app !== 'string') {
    issues.push({ path: ['app'], message: "Required: the app's route segment, as a string" })
  }
  const reference = body['reference']
  if (reference === undefined) {
    issues.push({
      path: ['reference'],
      message: 'Required: the reference control record {"reference": {…}}',
    })
  }
  if (typeof app !== 'string' || issues.length > 0) {
    throw new ValidationError('Request body is not a reference resolution request', { issues })
  }
  return { app, reference }
}

/**
 * Build the reference-resolution transport for a runtime.
 *
 * @remarks
 * Registers, relative to wherever the returned app is mounted, only
 * `POST /resolve`. The body is a {@link ResolveReferenceRequest};
 * `Authorization: Bearer <token>` carries the credential; `X-Request-Id`
 * optionally supplies the correlation id. A body that is not JSON, not an
 * object, or lacks a string `app` or a `reference` is answered 400
 * `VALIDATION_FAILED` without calling the runtime.
 *
 * Success is `200 { result }`: the resolved record for a single reference, an
 * array of records (possibly empty) for a collection reference. Failure is the
 * D6 error envelope with the same statuses and headers as the RPC routes. Any
 * other method or path is a 404 `NOT_FOUND` route miss.
 *
 * Give this adapter and {@link createHttpAdapter} the same
 * `addressRateLimiter` to limit each client address across both, as the macts
 * server does.
 *
 * @param runtime - The runtime that resolves every reference.
 * @param options - Logger, client-address resolution, and the per-address limit.
 * @returns A Hono app to mount (the macts server mounts it at `/references/v1`).
 */
export function createReferencesAdapter(
  runtime: MactsRuntime,
  options: HttpAdapterOptions = {}
): Hono {
  const transport = createCallTransport(options)
  const app = new Hono()

  app.post('/resolve', (c) =>
    serveRuntimeCall(c, transport, { call: 'resolveReference' }, (body, context) => {
      const request = readResolveRequest(body)
      return withSpan('references.resolve', async (span) => {
        span.setAttribute('references.app', request.app)
        return runtime.resolveReference(request.app, request.reference, context)
      })
    })
  )

  app.notFound(() => notFoundResponse())
  app.onError((error) => failureResponse(error, { logger: transport.logger() }))

  return app
}
