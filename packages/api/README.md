# @macts/api

HTTP API server for macOS app automation.

Serves macts operations over HTTP. The server composes the shared macts
runtime ([`@macts/runtime`](../runtime/README.md)) with a thin HTTP adapter:
every operation request is translated into one runtime invocation, which
verifies the credential, applies the rate limit, checks permission, enforces
governance, validates input, and only then executes. The HTTP layer adds
routing, the error envelope, CORS, logging, TLS, and graceful shutdown; it
duplicates none of the authorization logic.

## Features

- **Operation endpoints from manifests**: `POST /api/v1/rpc/{app}.{resource}.{operation}` for every manifest operation
- **One invocation pipeline**: authentication, permissions, governance, and input validation run in `@macts/runtime`, identically for every macts surface
- **Structured errors**: every failure is a `{ "error": { code, message, details } }` envelope with a closed set of codes that `@macts/contracts` clients reconstruct into the same error classes
- **Rate limiting**: per API key after authentication, and per client address before it
- **Pluggable execution**: the native macOS executor by default; inject any `Executor` for tests or alternate providers
- **Multi-App Support**: Serve multiple macOS apps from a single server instance

## Installation

```bash
npm install @macts/api
```

## Quick Start

### Starting a Server

```typescript
import { createServer, DEFAULT_PORT } from '@macts/api/server'
import { loadManifest } from '@macts/core'

// Load an app manifest
const manifest = await loadManifest('./manifests/calendar/app.yaml')

// Create and start the server
const { app, start, url } = createServer(manifest, {
  port: DEFAULT_PORT, // 8372
  host: 'localhost',
  logging: true,
  cors: true,
})

await start()
console.log(`Server running at ${url}`)
```

### Multi-App Server

```typescript
import { createMultiServer } from '@macts/api/server'

const calendar = await loadManifest('./manifests/calendar/app.yaml')
const reminders = await loadManifest('./manifests/reminders/app.yaml')

const { start } = createMultiServer([calendar, reminders], {
  port: 8372,
})

await start()
```

### Creating API Keys

API keys are minted, verified, and stored by `@macts/runtime`, which every macts
surface (this server, the MCP server, the CLI, and the local SDK) shares.

```typescript
import { createApiKey, createFullAccessKey, createReadOnlyKey } from '@macts/runtime'
import { loadManifest } from '@macts/core'

// Create a key with specific permissions
const result = await createApiKey({
  name: 'my-app',
  permissions: ['calendar:events:list', 'calendar:events:create'],
  expires: '30d', // Optional: expire in 30 days
})

console.log('API Key:', result.token)
console.log('Key ID:', result.keyId)

// Create a full-access key for an app
const fullAccess = await createFullAccessKey('calendar', 'admin-key')

// Create a read-only key with permission expansion
const manifest = await loadManifest('./manifests/calendar/app.yaml')
const readOnly = await createReadOnlyKey('calendar', 'readonly-key', manifest.permissions!)
```

## API Reference

### Server Creation

#### `createServer(manifest, options?)`

Create a server for a single app.

```typescript
interface ServerOptions {
  port?: number // Default: 8372
  host?: string // Default: 'localhost'
  cors?: boolean | { origin: string | string[] } // Default: true
  logging?: boolean // Default: false
  logger?: pino.Logger // Default: the process-wide macts logger
  prettyJson?: boolean // Default: true in development
  gracefulShutdownTimeout?: number // Default: 10000 (ms)
  tls?: TlsOptions // HTTPS when set
  rateLimit?: RateLimitOptions | false // Default: 100/min per key, 300/min per address
  governance?: GovernanceContext // Default: this Mac's governance (loadHostGovernance from @macts/runtime)
  executor?: Executor // Default: createNativeExecutor() from @macts/core
  verifier?: CredentialVerifier // Default: the @macts/runtime key-store verifier
  clientAddress?: (c: Context) => string | undefined // Default: the socket's remote address
}

interface RateLimitOptions {
  windowMs?: number // Per-key window. Default: 60000
  max?: number // Calls per key per window. Default: 100
  perAddress?: { windowMs?: number; max?: number } // Default: 300 per 60000 ms
}

interface ServerInstance {
  app: Hono // The Hono app instance
  start(): Promise<void> // Start the server
  stop(): Promise<void> // Stop the server
  url: string | null // Server URL after start
}
```

When `governance` is omitted, the server enforces this Mac's governance,
loaded from `MACTS_HOME` on the first call: the policy file at
`governance/policy.json` (or the default policy when there is none), the
approval provider registered in `governance/approval.json`, every key's own
policy, and an audit log at `governance/audit.jsonl`. A malformed or unreadable
policy or approval file denies every call with `500 INTERNAL`; it never falls
back to allowing everything. Pass a `GovernanceContext` to enforce something
else.

**Example:**

```typescript
const { app, start, stop, url } = createServer(manifest, {
  port: 8372,
  host: 'localhost',
  logging: true,
})

await start()
console.log(`Server at ${url}`)

// Later...
await stop()
```

#### `createMultiServer(manifests, options?)`

Create a server for multiple apps.

```typescript
const server = createMultiServer([calendarManifest, remindersManifest], {
  port: 8372,
})
```

#### `createApp(manifests, options?)`

Create just the Hono app without server lifecycle methods. Accepts every
`ServerOptions` field except the listener ones (`port`, `host`, `tls`,
`gracefulShutdownTimeout`). Useful for testing, with an injected executor and
verifier, or for custom server setups.

```typescript
const app = createApp([manifest], { executor: myStubExecutor, verifier: myFakeVerifier })
const res = await app.request('/api/v1/rpc/calendar.events.list', {
  method: 'POST',
  headers: { Authorization: 'Bearer macts_sk_...' },
})
```

### API Key Management

The functions in this section and the next are exported by `@macts/runtime`.

#### `createApiKey(options, permissionsSection?)`

Create a new API key with specified permissions.

```typescript
interface CreateApiKeyOptions {
  name: string // Human-readable key name
  permissions: string[] // Permissions to grant
  expires?: Date | number | string // Optional expiration
}

interface CreateApiKeyResult {
  token: string // Prefixed token: macts_sk_...
  keyId: string // Unique key ID
  metadata: ApiKeyMetadata
}
```

**Expiration formats:**

- `Date` object: Absolute expiration date
- `number`: Unix timestamp in seconds (or milliseconds if > year 3000)
- `string`: Duration string: "30d", "1h", "2w", "6m", "1y"

**Permission expansion:**
If you provide the `permissionsSection` from a manifest, coarse and wildcard permissions are expanded to fine-grained equivalents:

```typescript
// Without expansion (permissions used as-is)
const key1 = await createApiKey({
  name: 'test',
  permissions: ['calendar:events:list', 'calendar:events:create'],
})

// With expansion
const manifest = await loadManifest('./manifests/calendar/app.yaml')
const key2 = await createApiKey(
  {
    name: 'test',
    permissions: ['calendar:*:read'], // Expands to all read operations
  },
  manifest.permissions
)
```

#### `createFullAccessKey(appName, name, expires?)`

Create a key with full access to an app (uses `app:*:*` permission).

```typescript
const key = await createFullAccessKey('calendar', 'admin-key', '90d')
```

#### `createReadOnlyKey(appName, name, permissionsSection, expires?)`

Create a key with read-only access (uses `app:*:read` permission, expanded).

```typescript
const key = await createReadOnlyKey('calendar', 'readonly-key', manifest.permissions!, '30d')
```

#### `listApiKeys(options?)`

List all API keys in the database.

```typescript
interface ListApiKeysOptions {
  includeRevoked?: boolean // Include revoked keys (default: false)
  namePattern?: string // Filter by name pattern
}

const keys = await listApiKeys({ includeRevoked: false })
for (const key of keys) {
  console.log(`${key.name} (${key.id}): ${key.permissions.length} permissions`)
}
```

#### `revokeApiKey(keyId)`

Revoke an API key by its ID.

```typescript
await revokeApiKey('key_abc123')
```

#### `getApiKeyMetadata(keyId)`

Get metadata for an API key.

```typescript
const metadata = await getApiKeyMetadata('key_abc123')
if (metadata) {
  console.log(`Created: ${metadata.createdAt}`)
  console.log(`Revoked: ${metadata.revoked}`)
}
```

### API Key Validation

#### `validateApiKey(token)`

Validate an API key token.

```typescript
interface ApiKeyValidationResult {
  valid: boolean
  payload?: ApiKeyPayload // Present if valid
  error?: string // Present if invalid
  errorCode?: string // Error code if invalid
}

const result = await validateApiKey(token)
if (result.valid) {
  console.log('Key ID:', result.payload.sub)
  console.log('Permissions:', result.payload.permissions)
} else {
  console.error(`Validation failed: ${result.error} (${result.errorCode})`)
}
```

**Error codes:**

- `INVALID_FORMAT`: Token doesn't start with `macts_sk_` or is malformed
- `INVALID_SIGNATURE`: JWT signature verification failed
- `EXPIRED`: Token has passed its expiration time
- `REVOKED`: Token has been revoked
- `MALFORMED_PAYLOAD`: Token payload doesn't match expected structure

#### `validateAndCheckPermission(token, requiredPermission, permissionHistory?)`

Validate a token and check if it has a required permission.

```typescript
const result = await validateAndCheckPermission(token, 'calendar:events:list')

if (result.granted) {
  console.log('Permission granted')
} else {
  console.log(`Denied: ${result.hint}`)
}
```

#### `checkPayloadPermission(payload, requiredPermission, permissionHistory?)`

Check if a validated payload has a specific permission. Use after validation.

```typescript
const validation = await validateApiKey(token)
if (validation.valid) {
  const check = checkPayloadPermission(validation.payload, 'calendar:events:create')

  if (check.granted) {
    // Proceed with operation
  }
}
```

#### Extraction Utilities (No Signature Verification)

These functions extract information from tokens without validating signatures. Useful for debugging and inspection.

```typescript
// Extract permissions
const permissions = extractPermissionsFromToken(token)
console.log('Permissions:', permissions)

// Extract key ID
const keyId = extractKeyIdFromToken(token)
console.log('Key ID:', keyId)
```

### HTTP Adapter

#### `createHttpAdapter(runtime, options?)`

The pure HTTP transport over a `MactsRuntime`. `createServer` mounts it at
`/api/v1`; use it directly to serve a runtime you composed yourself.

```typescript
import { createHttpAdapter } from '@macts/api/server'
import { createRuntime } from '@macts/runtime'
import { createNativeExecutor } from '@macts/core'
import { Hono } from 'hono'

const runtime = createRuntime({ executor: createNativeExecutor() })
runtime.registerManifest(manifest)

const app = new Hono().route('/api/v1', createHttpAdapter(runtime))
```

It registers `POST /rpc/<operation id>` for each operation registered on the
runtime when it is built, plus `GET /introspect` and `GET /introspect/all`. For
each request it reads the JSON body (a missing or blank body is `{}`), the
`Authorization: Bearer` credential, the request's abort signal, and an optional
`X-Request-Id` correlation id, and calls `runtime.invoke`. It never verifies a
credential or evaluates policy itself.

Options:

- `logger` — destination for diagnostics about failed requests.
- `clientAddress(c)` — resolves the client address for the per-address limit.
  The default reads the socket's remote address (Node via `@hono/node-server`,
  or Bun's `requestIP`). Requests with no network peer, such as in-process
  `app.request` calls, are not counted.
- `addressRateLimiter` — a `RateLimiter` from `@macts/runtime`, or `false`.
  Default: 300 requests per minute per address.

#### `httpStatusForError(error)`

The HTTP status the adapter uses for a structured error. See
[Error Codes](#error-codes) for the full table.

## Server Endpoints

When you start a server, these endpoints are automatically available:

### Health Check (No Auth)

```bash
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "version": "0.2.0",
  "apps": ["calendar"]
}
```

`version` is the installed `@macts/api` package version.

### API Info (No Auth)

```bash
GET /api/v1
```

**Response:**

```json
{
  "name": "macts API",
  "version": "v1",
  "documentation": "https://github.com/macts/macts",
  "apps": [
    {
      "name": "calendar",
      "bundleId": "com.apple.iCal"
    }
  ]
}
```

### RPC Endpoints (Auth Required)

```bash
POST /api/v1/rpc/{app}.{resource}.{operation}
Authorization: Bearer macts_sk_...
Content-Type: application/json
X-Request-Id: optional-correlation-id

{
  "arg1": "value1",
  "arg2": "value2"
}
```

**Success Response (200):**

```json
{
  "result": { ... }
}
```

**Error Response:**

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Missing required permission: calendar:events:create",
    "details": { "required": "calendar:events:create" }
  }
}
```

### Introspection (No Auth)

```bash
GET /api/v1/introspect       # the first app's endpoints, with descriptions, parameters, and returns
GET /api/v1/introspect/all   # every app's endpoints
```

## Error Codes

Every failure is the envelope `{ "error": { "code", "message", "details" } }`.
The codes and the shape of `details` for each are defined by
`@macts/contracts` (`ErrorDetailsByCode`), and a client reconstructs the error
class from `code` with `fromWireErrorEnvelope`. The HTTP status is advisory.

| `code`                       | Status          | Meaning and `details`                                                                                   |
| ---------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `VALIDATION_FAILED`          | 400             | The request body or input violated the operation contract. `issues[]`, each `{ path, message, code? }`. |
| `UNAUTHENTICATED`            | 401             | No usable credential. `reason`: `missing`, `malformed`, `invalid`, `expired`, or `revoked`.             |
| `RATE_LIMITED`               | 429             | Too many requests. `retryAfterSeconds`; the same value is sent as the `Retry-After` header.             |
| `PERMISSION_DENIED`          | 403             | The key lacks the permission. `required`, and `hint` / `changelog` when the permission was renamed.     |
| `POLICY_DENIED`              | 403             | Governance policy forbids the call. `permission`, `layer` (`host` or `key`).                            |
| `APPROVAL_PENDING`           | 409             | The call needs human confirmation and no approval provider is configured; it did not run.               |
| `APPROVAL_REJECTED`          | 403             | The call was put to a human and not approved. `permission`, `layer`, `state` (`rejected` or `timeout`). |
| `TARGET_NOT_FOUND`           | 404             | A singular target does not exist. `resource?`.                                                          |
| `FILE_NOT_FOUND`             | 404             | A referenced file does not exist. `path?`.                                                              |
| `INVALID_SELECTION`          | 400             | A range or index selection is invalid. `resource?`.                                                     |
| `UNEXPECTED_VALUE`           | 502             | The app returned a value outside the operation contract. `issues[]`.                                    |
| `APP_UNAVAILABLE`            | 503             | The app is not installed or not responding. `app`, `reason`.                                            |
| `APP_AUTHORIZATION_REQUIRED` | 503             | macOS has not authorized automating the app. `app`.                                                     |
| `APP_OPERATION_FAILED`       | 502             | The app reported another failure. `app`, `appErrorCode?`.                                               |
| `TIMEOUT`                    | 504             | The operation exceeded its time budget. `timeoutMs`.                                                    |
| `CANCELLED`                  | 499             | The caller aborted the request.                                                                         |
| `TRANSFER_FAILED`            | 400 / 410 / 413 | A transfer was incomplete or unknown (400), expired (410), or too large (413). `reason`.                |
| `INTERNAL`                   | 500             | An unexpected failure. The message is generic; `correlationId?` echoes `X-Request-Id`.                  |

`NOT_FOUND` (404) is returned for a request that matches no route, including
`POST /api/v1/rpc/<unknown operation>`. It is deliberately not one of the codes
above: it means the client and server disagree about the API, and clients treat
it as a protocol mismatch.

Messages never contain the credential, and an unexpected failure's original
text is logged on the server but never returned.

## Environment Variables

The API uses environment variables for configuration. All variables are optional with sensible defaults.

### `MACTS_API_KEY`

**Used by:** SDK clients (`@macts/sdk-calendar`, etc.)

**Description:** API key for authenticating with the macts API server. Must be a token generated by `createApiKey()` starting with `macts_sk_`.

**Example:**

```bash
export MACTS_API_KEY=macts_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Default:** None (SDK will throw an error if not provided)

### `MACTS_API_KEY_SECRET`

**Used by:** `@macts/api` (server and key validation)

**Description:** Override the API key signing secret. By default, a secret is auto-generated and stored in `~/.macts/secrets/api-key-secret`. Set this variable to use a custom secret (useful for key sharing across multiple machines).

**Example:**

```bash
export MACTS_API_KEY_SECRET=your-base64-secret-here
```

**Default:** Auto-generated 256-bit base64 secret stored in `~/.macts/secrets/api-key-secret`

**Security Warning:** Keep this secret secure. Anyone with access can forge valid API keys.

### `MACTS_API_URL`

**Used by:** SDK clients (`@macts/sdk-calendar`, etc.)

**Description:** Base URL for the macts API server. Useful for connecting to a remote server or using a non-default port.

**Example:**

```bash
export MACTS_API_URL=https://api.example.com
export MACTS_API_URL=http://localhost:3000
```

**Default:** `http://localhost:8372`

### `NODE_ENV`

**Used by:** `@macts/api` (server)

**Description:** Node.js environment mode. Affects error message verbosity and default middleware settings.

**Values:**

- `production`: Sanitized error messages, JSON pretty-printing disabled by default
- `development`: Detailed error messages, JSON pretty-printing enabled by default
- Other values: Treated as development

**Example:**

```bash
export NODE_ENV=production
```

**Default:** `development` (if not set)

### `HOME`

**Used by:** `@macts/api` (storage)

**Description:** User home directory. Used to locate the macts configuration directory (`~/.macts`).

**Example:**

```bash
export HOME=/Users/username
```

**Default:** Automatically set by the operating system

## Troubleshooting

### Server Won't Start

#### Port Already in Use

**Symptom:** Error like `EADDRINUSE: address already in use :::8372`

**Cause:** Another process is using port 8372.

**Solution:**

1. Find the process using the port:
   ```bash
   lsof -i :8372
   ```
2. Kill the process or use a different port:
   ```typescript
   createServer(manifest, { port: 8373 })
   ```

#### Permission Denied (Port < 1024)

**Symptom:** Error like `EACCES: permission denied` when binding to port 80 or 443

**Cause:** Ports below 1024 require root privileges on Unix systems.

**Solution:**

1. Use a port above 1024 (recommended):
   ```typescript
   createServer(manifest, { port: 8372 })
   ```
2. Or run with sudo (not recommended):
   ```bash
   sudo node server.js
   ```

### Authentication Failures

#### Invalid Token Format

**Symptom:** `UNAUTHENTICATED` with `reason: "malformed"` even though the token looks correct

**Cause:** Token is not prefixed with `macts_sk_` or is truncated.

**Solution:**

- Verify the token starts with `macts_sk_`
- Check that the full token was copied (tokens are long, around 200+ characters)
- Ensure no whitespace or newlines were added when copying

#### Expired Keys

**Symptom:** `UNAUTHENTICATED` with `reason: "expired"`

**Cause:** Token expiration time has passed.

**Solution:**

- Create a new API key
- List existing keys to check expiration: `listApiKeys()`
- Use longer expiration times or no expiration for persistent keys

#### Wrong Signing Secret

**Symptom:** `UNAUTHENTICATED` with `reason: "invalid"` on a valid-looking token

**Cause:** The server's signing secret doesn't match the secret used to create the token.

**Solution:**

- If you set `MACTS_API_KEY_SECRET`, ensure it's the same on all machines
- If you moved the `~/.macts` directory, restore it to the original location
- Create new keys with the current signing secret

### TLS/HTTPS Issues

#### Certificate Format Error

**Symptom:** Error like `error:0480006C:PEM routines::no start line`

**Cause:** Certificate files are not in PEM format.

**Solution:**

- Ensure cert and key files are in PEM format (start with `-----BEGIN CERTIFICATE-----`)
- Convert from other formats: `openssl x509 -in cert.der -inform der -out cert.pem`

#### Certificate Permission Denied

**Symptom:** `EACCES: permission denied` when reading cert/key files

**Cause:** Certificate files don't have read permissions for the current user.

**Solution:**

```bash
chmod 644 server.crt
chmod 600 server.key
```

#### Self-Signed Certificate Warning

**Symptom:** Clients reject the connection with "certificate verify failed"

**Cause:** Using self-signed certificates without proper trust configuration.

**Solution:**

- For development, clients can disable certificate verification (not recommended for production)
- For production, use certificates from a trusted CA
- Add self-signed cert to system trust store for testing

### Rate Limiting

#### Too Many Requests

**Symptom:** `RATE_LIMITED` error code (HTTP 429)

**Cause:** Exceeded a configured limit: 100 calls per minute per API key, or
300 requests per minute per client address (counted before authentication).

**Solution:**

1. Wait `details.retryAfterSeconds` (also sent as the `Retry-After` header)
2. Adjust the limits in server configuration:
   ```typescript
   createServer(manifest, {
     rateLimit: {
       max: 1000, // per API key
       windowMs: 60_000, // 1 minute
       perAddress: { max: 3000 },
     },
   })
   ```
3. Disable both limits (not recommended for production):
   ```typescript
   createServer(manifest, { rateLimit: false })
   ```

### App Errors

#### App Not Running

**Symptom:** `APP_UNAVAILABLE` error code

**Cause:** Target macOS app is not currently running.

**Solution:**

- Launch the app before sending it commands

#### Permission Not Granted

**Symptom:** `APP_AUTHORIZATION_REQUIRED` error code

**Cause:** Your Node.js process doesn't have Automation permission for the target app.

**Solution:**

1. Open **System Settings > Privacy & Security > Automation**
2. Find your Node.js runtime (Node, Terminal, iTerm, etc.)
3. Check the box next to the target app (Calendar, Reminders, etc.)
4. Restart the server after granting permission

#### App in Unexpected State

**Symptom:** `TARGET_NOT_FOUND` or `APP_OPERATION_FAILED` error codes

**Cause:** The app's state doesn't match what the command expects (e.g., trying to show an event that was deleted).

**Solution:**

- Verify IDs are correct and resources exist before operations
- Use list operations to confirm state before mutations
- Handle errors gracefully and retry if appropriate

### Connection Issues

#### Cannot Connect from Remote Machine

**Symptom:** Connection refused or timeout when accessing from another machine

**Cause:** Server is bound to `localhost` which only accepts local connections.

**Solution:**

- Bind to all interfaces:
  ```typescript
  createServer(manifest, { host: '0.0.0.0' })
  ```
- Or bind to a specific network interface:
  ```typescript
  createServer(manifest, { host: '192.168.1.100' })
  ```
- Ensure firewall allows connections on the port

#### Firewall Blocking Connections

**Symptom:** Connection timeout from specific networks

**Cause:** macOS firewall or network firewall blocking the port.

**Solution:**

1. Open **System Settings > Network > Firewall > Options**
2. Allow incoming connections for your Node.js binary
3. Or temporarily disable firewall for testing (not recommended)

## Security Considerations

### API Key Storage

API keys are JWT tokens signed with HS256 (HMAC-SHA256). The signing secret is generated on first use and stored in:

```
~/.macts/api-keys.db
```

This SQLite database contains:

- Signing secret (generated once, reused for all keys)
- Key metadata (ID, name, permissions, creation date, expiration, revocation status)

**Important:** Keep this database secure. Anyone with access can:

- Revoke existing keys
- View key metadata (but NOT the actual tokens)
- Use the signing secret to forge new tokens

The database file is created with restricted permissions (`0600` on Unix-like systems).

### Permission Expansion

Coarse permissions are expanded at key creation time, not at validation time.
At validation time, only **exact** and **wildcard** matching apply (see below).

- **Coarse permissions** (e.g., `calendar:events:read`) are _sugar_ that must be
  expanded against a manifest's `permissions` section. Pass the section to
  `createApiKey` to expand `read` into the fine-grained operations it covers
  (e.g., `calendar:events:list`, `calendar:events:get`, `calendar:events:show`).
  A coarse permission requested **without** a `permissionsSection` is rejected
  with `UnexpandableCoarsePermissionError`, because an unexpanded coarse scope
  authorizes nothing — the error names the wildcard and fine-grained
  alternatives to use instead.
- **Wildcard permissions** (e.g., `calendar:events:*`, `calendar:*:*`) are
  stored as-is and matched directly: a `*` in the resource and/or operation
  segment matches anything in that segment. The app segment must match exactly.
- **Fine-grained permissions** (e.g., `calendar:events:list`) are stored as-is
  and authorize exactly that call.

This means:

- Keys contain an explicit list of fine-grained and/or wildcard permissions
- You can't grant new permissions to existing keys by updating the manifest
- Revoking a permission in the manifest doesn't affect existing keys

To apply permission changes, revoke and recreate the key.

### Matching & Denials

`hasPermission(granted, required)` grants when any granted permission covers the
required `app:resource:operation` by exact or wildcard match. There is no
implicit grouping — `calendar:events:list` does not cover `calendar:events:get`.
A denial names the precise missing permission and the resource wildcard that
would also authorize the call, so the fix is a single grant.

### Token Expiration

Set expiration times for API keys when possible:

```typescript
// Expire in 30 days
const key = await createApiKey({
  name: 'temporary',
  permissions: ['calendar:events:*'],
  expires: '30d',
})
```

Expired tokens are rejected during validation, even if not explicitly revoked.

### CORS Configuration

By default, the server allows all origins (`*`) in development. For production:

```typescript
createServer(manifest, {
  cors: {
    origin: ['https://myapp.com', 'https://admin.myapp.com'],
  },
})
```

Or disable CORS entirely:

```typescript
createServer(manifest, { cors: false })
```

## TypeScript Configuration

This package is ESM-only. Your project should have:

```json
{
  "type": "module"
}
```

And your `tsconfig.json` should include:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## Package Exports

The package provides three entry points:

```typescript
// Main export
import { createServer } from '@macts/api'

// Server-only export
import { createServer, createHttpAdapter, httpStatusForError } from '@macts/api/server'

// Telemetry export
import { configureTelemetry, withSpan } from '@macts/api/telemetry'
```

## Error Handling

All async functions can throw errors. Use try-catch blocks:

```typescript
try {
  const result = await createApiKey({
    name: 'test',
    permissions: ['invalid:permission'],
  })
} catch (error) {
  console.error('Failed to create key:', error.message)
}
```

## License

MIT
