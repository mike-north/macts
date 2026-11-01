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
| API keys           | `createApiKey`, `validateApiKey`, `validateAndCheckPermission`, `checkPayloadPermission`, `revokeKey`, `loadKeyMetadata`, `getSigningSecret`, `closeKeyStore` |
| Per-key policies   | `setKeyPolicy`, `getKeyPolicy`, `deleteKeyPolicy`, `listKeyPolicyIds`, `createStoredKeyPolicyResolver`                                                        |
| Governance loading | `loadActivePolicy`, `ALLOW_ALL_POLICY`, `loadApprovalGate`, `GovernanceContext`, `resolveGovernanceForRequest`                                                |
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
verify the credential, check the operation's permission, enforce governance
policy (auditing the decision and, for a held call, asking a human), validate
the input, then hand the request to the executor the runtime was built with.
Failures are the structured errors from `@macts/contracts`.

```ts
import { createBearerCredential, createRuntime } from '@macts/runtime'

const runtime = createRuntime({ executor })
runtime.registerManifest(manifest)

const result = await runtime.invoke(
  'calendar.calendars.list',
  {},
  { credential: createBearerCredential(token) }
)
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
