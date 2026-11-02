/**
 * The HTTP adapter: macts operations over HTTP, as a pure transport over a
 * {@link MactsRuntime}.
 *
 * The adapter translates each HTTP request into one `runtime.invoke` call and
 * the outcome back into an HTTP response. It owns routing only:
 * `POST /rpc/<operation id>` for every registered operation, and nothing else
 * under `/rpc/`, plus the unauthenticated introspection listings. Everything
 * else about a request (the invocation context, the JSON body, the
 * per-client-address limit, the success envelope, and the D6 error mapping)
 * is the protocol every runtime route shares, in `./call-protocol.ts`.
 *
 * It never verifies a credential, checks a permission, evaluates policy, or
 * validates operation input: the runtime does all of that, identically for
 * every surface (phases/13 D5). The adapter never logs or returns the
 * credential, and never echoes the text of an unexpected failure.
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import type { Command } from '@macts/core'
import type { MactsRuntime, RegisteredOperation } from '@macts/runtime'
import { withSpan } from '../telemetry.js'
import {
  createCallTransport,
  failureResponse,
  notFoundResponse,
  serveRuntimeCall,
  type HttpAdapterOptions,
} from './call-protocol.js'

export {
  DEFAULT_ADDRESS_RATE_LIMIT,
  defaultClientAddress,
  httpStatusForError,
  type ClientAddressResolver,
  type HttpAdapterOptions,
  type RpcSuccessResponse,
} from './call-protocol.js'

/** One endpoint in the introspection listing. */
interface IntrospectedEndpoint {
  readonly path: string
  readonly permission: string
  readonly method: 'POST'
}

/** One endpoint in a single app's detailed introspection listing. */
interface DetailedEndpoint extends IntrospectedEndpoint {
  readonly description: string
  readonly parameters: Command['parameters']
  readonly returns: Command['returns']
}

/** The registered operations of one app, in registration order. */
interface AppOperations {
  readonly app: string
  readonly bundleId: string
  readonly operations: readonly RegisteredOperation[]
}

/** The HTTP path an operation is served at, relative to the adapter's mount point. */
function operationPath(operation: RegisteredOperation): string {
  return `/rpc/${operation.descriptor.id}`
}

/** Group registered operations by the manifest that executes them, in registration order. */
function groupByApp(operations: readonly RegisteredOperation[]): AppOperations[] {
  const groups = new Map<RegisteredOperation['manifest'], RegisteredOperation[]>()
  for (const operation of operations) {
    const group = groups.get(operation.manifest)
    if (group === undefined) {
      groups.set(operation.manifest, [operation])
    } else {
      group.push(operation)
    }
  }
  return [...groups].map(([manifest, ops]) => ({
    app: manifest.app.name,
    bundleId: manifest.app.bundleId,
    operations: ops,
  }))
}

/** The summary listing entry for an operation. */
function summarize(operation: RegisteredOperation): IntrospectedEndpoint {
  return {
    path: operationPath(operation),
    permission: operation.descriptor.permission,
    method: 'POST',
  }
}

/** The detailed listing entry for an operation, from its manifest command. */
function detail(operation: RegisteredOperation): DetailedEndpoint {
  const { manifest, descriptor } = operation
  const command = Object.hasOwn(manifest.commands, descriptor.target.command)
    ? manifest.commands[descriptor.target.command]
    : undefined
  return {
    ...summarize(operation),
    description: command?.description ?? descriptor.description,
    parameters: command?.parameters ?? [],
    returns: command?.returns,
  }
}

/**
 * Build the HTTP transport for a runtime.
 *
 * @remarks
 * Registers, relative to wherever the returned app is mounted:
 *
 * - `POST /rpc/<id>` for each operation registered on the runtime when the
 *   adapter is built. The body is the operation's input record in wire form (a
 *   missing or blank body is `{}`); `Authorization: Bearer <token>` carries
 *   the credential; `X-Request-Id` optionally supplies the correlation id.
 *   Success is `200 { result }`; failure is the D6 error envelope with the
 *   status from {@link httpStatusForError}, plus `WWW-Authenticate: Bearer`
 *   for `UNAUTHENTICATED` and `Retry-After` for `RATE_LIMITED`.
 * - `GET /introspect`: the first registered app's operations with their
 *   manifest descriptions, parameters, and return types.
 * - `GET /introspect/all`: every registered app's operations.
 *
 * Any other route, including `POST /rpc/<unregistered id>`, is a 404 whose
 * code `NOT_FOUND` is deliberately outside the error registry, and never
 * reaches the runtime. Operations registered on the runtime after this call
 * are not routed.
 *
 * @param runtime - The runtime that runs every operation.
 * @param options - Logger, client-address resolution, and the per-address limit.
 * @returns A Hono app to mount (the macts server mounts it at `/api/v1`).
 */
export function createHttpAdapter(runtime: MactsRuntime, options: HttpAdapterOptions = {}): Hono {
  const transport = createCallTransport(options)

  // Routes and introspection share one snapshot, so the listing never names an
  // operation this adapter does not serve.
  const operations = runtime.operations()
  const apps = groupByApp(operations)
  const app = new Hono()

  for (const operation of operations) {
    const { id, target } = operation.descriptor
    const path = operationPath(operation)

    app.post(path, (c) =>
      serveRuntimeCall(c, transport, { operation: id }, (input, context) =>
        withSpan('rpc.execute', async (span) => {
          span.setAttribute('rpc.operation', id)
          span.setAttribute('rpc.command', target.command)
          span.setAttribute('rpc.path', path)
          return runtime.invoke(id, input, context)
        })
      )
    )
  }

  app.get('/introspect', (c) => {
    const first = apps[0]
    if (first === undefined) {
      return notFoundResponse()
    }
    return c.json({
      app: first.app,
      bundleId: first.bundleId,
      endpoints: first.operations.map(detail),
    })
  })

  app.get('/introspect/all', (c) =>
    c.json({
      apps: apps.map((group) => ({
        app: group.app,
        bundleId: group.bundleId,
        endpoints: group.operations.map(summarize),
      })),
    })
  )

  app.notFound(() => notFoundResponse())
  app.onError((error) => failureResponse(error, { logger: transport.logger() }))

  return app
}
