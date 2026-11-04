---
'@macts/sdk': minor
'@macts/runtime': minor
'@macts/api': minor
---

Create typed clients from an app's contract, remotely or on this Mac, under this Mac's governance

**`@macts/sdk`** now has two entry points with the same `createClient(app, options)` factory. Each takes an app's contract (app packages expose it at the `/contract` subpath) and returns that app's typed client:

- **`@macts/sdk`**: `createClient(app, { token, url, fetch? })` runs operations on a macts service over HTTP. Inputs are validated before anything is sent (`ValidationError`), results are validated on the way back (`UnexpectedValueError`), and service errors come back as the same canonical classes a local call throws. Aborts become `OperationCancelledError`, and an unreachable service or unusable response becomes `TransportError`. The token is sent only in the `Authorization` header and never appears in an error. This entry point never loads the Mac-side runtime, so it runs anywhere Node runs.
- **`@macts/sdk/local`**: `createClient(app, { token, governance?, executor? })` runs operations in process on this Mac, through the same pipeline the service runs: token verification, permission checks, governance, and validation. A contract whose permissions disagree with its manifest is refused on the first call.
- Both entry points re-export everything from `@macts/contracts` (error classes, value types), so `instanceof` works across them and application code imports only `@macts/sdk`.
- `resolveClientOptions()` reads `MACTS_API_KEY` and `MACTS_API_URL` and returns `{ token, url }` for `createClient`.
- Node.js 22.13.0 or later is required.

**Breaking:** `createMactsClients`, `MactsClients`, the re-exported per-app client types, `resolveConnectionOptions`, and `MactsConnectionOptions` are removed, along with the 35 optional app peer dependencies. `@macts/sdk` no longer fails to import when app packages are missing ([#118](https://github.com/mike-north/macts/issues/118)). Create each app's client from its contract instead, and install the app packages a script uses. `resolveClientOptions()` replaces `resolveConnectionOptions()` and reads the same `MACTS_API_KEY` and `MACTS_API_URL`. Method names, arguments, and results are unchanged:

```typescript
// Before: one map of every app's client, configured from the environment.
import { createMactsClients } from '@macts/sdk'

const m = createMactsClients()
const calendars = await m.calendar.calendars.list()

// After: one client per app, created from that app's contract.
import { createClient, resolveClientOptions } from '@macts/sdk'
import { calendarContract } from '@macts/calendar/contract'

const calendar = createClient(calendarContract, resolveClientOptions())
const calendars = await calendar.calendars.list()
```

**`@macts/runtime`** adds `loadHostGovernance()`, the governance this Mac enforces when none is supplied: the policy file and approval provider under `MACTS_HOME`, each key's own policy, and an audit log at `<macts-home>/governance/audit.jsonl` (`getAuditLogPath()`). A missing policy file means the default policy. A malformed or unreadable policy or approval file denies every call that passes the permission check with `InternalError` and never falls back to allowing everything; a caller without the permission is still answered `PermissionDeniedError`. `createRuntime({ governance })` now also accepts a loader such as `loadHostGovernance`, which runs once, on the first call that reaches governance or needs the audit log.

**Breaking:** `createRuntime` now requires `governance`. Omitting it used to mean an allow-all policy with no audit log; now it is a type error, so a host can never run calls under governance it forgot to supply. Pass `loadHostGovernance` to enforce this Mac's governance, or `{ policy: ALLOW_ALL_POLICY }` to state that nothing is restricted.

**`@macts/api`**: `createServer`, `createMultiServer`, and `createApp` now enforce `loadHostGovernance()` when no `governance` option is given, instead of an allow-all policy with no audit log. Every governed call is now recorded in the audit log under `MACTS_HOME`. Pass `governance` explicitly to enforce something else.
