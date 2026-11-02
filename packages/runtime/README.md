# @macts/runtime

The Mac-side runtime shared by every macts surface that executes operations:
the local SDK, the HTTP API server (`@macts/api`), the MCP server
(`@macts/mcp`), and the CLI's API-key administration (`@macts/cli`).

Anything that must behave identically no matter which surface a call arrives
through lives here, so the surfaces can share it without depending on each
other.

## What's here

| Area               | Highlights                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invocation         | `createRuntime`, `MactsRuntime` (`registerManifest`, `registerContract`, `invoke`), `createBearerCredential`, `createKeyStoreVerifier`                        |
| Admission          | `createRateLimiter`, `RateLimiter`, `RateLimitAdmission`                                                                                                      |
| API keys           | `createApiKey`, `validateApiKey`, `validateAndCheckPermission`, `checkPayloadPermission`, `revokeKey`, `loadKeyMetadata`, `getSigningSecret`, `closeKeyStore` |
| Per-key policies   | `setKeyPolicy`, `getKeyPolicy`, `deleteKeyPolicy`, `listKeyPolicyIds`, `createStoredKeyPolicyResolver`                                                        |
| Governance loading | `loadHostGovernance`, `getAuditLogPath`, `loadActivePolicy`, `ALLOW_ALL_POLICY`, `loadApprovalGate`, `GovernanceContext`, `resolveGovernanceForRequest`       |
| Host state         | `getMactsHome` (honours `MACTS_HOME`, defaults to `~/.macts`), and the process-wide logger: `getLogger`, `setLogger`, `createLogger`                          |

## Usage

```ts
import { createApiKey, validateApiKey } from '@macts/runtime'

const { token } = await createApiKey({
  name: 'CI pipeline',
  permissions: ['calendar:events:list'],
  expires: '30d',
})

const result = await validateApiKey(token)
if (result.valid) {
  console.log(result.payload.permissions)
}
```

## Invoking operations

Every operation runs through one pipeline, in this order, for every caller:
verify the credential, admit the call against the optional per-subject rate
limit, check the operation's permission, enforce governance policy (auditing
the decision and, for a held call, asking a human), validate the input, then
hand the request to the executor the runtime was built with. Failures are the
structured errors from `@macts/contracts`.

A runtime is built from an executor and the governance it enforces. Both are
required: omitting governance is a compile error, never a silent allow-all.
Hosts that act for this Mac pass `loadHostGovernance` (below).

Admission only turns calls away (`RateLimitedError`); it never grants
anything. A limiter that fails denies the call with `InternalError`.

```ts
import { createRateLimiter, createRuntime, loadHostGovernance } from '@macts/runtime'

const runtime = createRuntime({
  executor,
  governance: loadHostGovernance,
  rateLimiter: createRateLimiter({ max: 100, windowMs: 60_000 }),
})
```

```ts
import { createBearerCredential, createRuntime, loadHostGovernance } from '@macts/runtime'

const runtime = createRuntime({ executor, governance: loadHostGovernance })
runtime.registerManifest(manifest)

const result = await runtime.invoke(
  'calendar.calendars.list',
  {},
  { credential: createBearerCredential(token) }
)
```

### Reserved app names

`references`, `transfers`, and `introspect` name namespaces a macts host serves
beside the apps (reference resolution, binary transfers, and the operation
listing), so none of them is ever an app's route segment.
`registerManifest` and `registerContract` throw `OperationRegistrationError`
for an app whose normalized name is one of them, and register nothing. The
names are exported as `RESERVED_APP_ROUTE_SEGMENTS`.

## This Mac's governance

`loadHostGovernance()` composes the governance a host enforces when nobody
supplies one: the policy at `<macts-home>/governance/policy.json`, the approval
provider registered in `<macts-home>/governance/approval.json`, each key's own
policy from the key store, and an audit log at
`<macts-home>/governance/audit.jsonl`. The local SDK client and the HTTP
server both default to it. Pass the function itself as `governance`, and the
runtime loads it on the first call:

```ts
import { createRuntime, loadHostGovernance } from '@macts/runtime'

const runtime = createRuntime({ executor, governance: loadHostGovernance })
```

- A **missing** policy file means the default policy (`ALLOW_ALL_POLICY`), so a
  first run works. The key's own permissions still gate every call.
- A **malformed or unreadable** policy or approval file denies every call with
  `InternalError`. Nothing falls back to allowing everything.
- An audit record that cannot be written denies the call it describes.

Tests and embedders that compose governance themselves pass their own context
instead. To enforce no restrictions, say so explicitly:

```ts
import { ALLOW_ALL_POLICY, createRuntime } from '@macts/runtime'

const runtime = createRuntime({ executor, governance: { policy: ALLOW_ALL_POLICY } })
```

## Storage

The signing secret lives at `<macts-home>/secrets/api-key-secret` (or comes from
`MACTS_API_KEY_SECRET`). Key metadata, revocation state, and per-key policies
live in a SQLite database at `<macts-home>/api-keys.db`, with permissions and
policies encrypted at rest.

The database uses Node's built-in `node:sqlite`, so installing macts never
builds or downloads a native addon. This is why the package requires
Node.js 22.13.0 or later, the first release that loads `node:sqlite` without a
flag. On Node versions that still label SQLite experimental, macts keeps that
one-time notice off your stderr; it does not hide any other warning.

## Requirements

- macOS (the runtime executes operations against local apps)
- Node.js >= 22.13.0

## License

MIT
