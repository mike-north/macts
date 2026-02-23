# @macts/api

HTTP API server for macOS app automation.

Provides a Hono-based HTTP server that exposes RPC endpoints for macOS app automation, along with JWT-based authentication, permission management, and a JXA (JavaScript for Automation) bridge for executing AppleScript operations.

## Features

- **HTTP Server**: Hono-based server with automatic RPC endpoint generation from manifests
- **Authentication**: JWT-based API key validation with Bearer token support
- **Permission System**: Fine-grained permission checking with wildcard and coarse permission expansion
- **API Key Management**: Generate, validate, list, and revoke API keys
- **JXA Bridge**: Execute AppleScript operations via JavaScript for Automation
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

```typescript
import { createApiKey, createFullAccessKey, createReadOnlyKey } from '@macts/api/keys'
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
  prettyJson?: boolean // Default: true in development
}

interface ServerInstance {
  app: Hono // The Hono app instance
  start(): Promise<void> // Start the server
  stop(): Promise<void> // Stop the server
  url: string | null // Server URL after start
}
```

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

Create just the Hono app without server lifecycle methods. Useful for testing or custom server setups.

```typescript
const app = createApp([manifest], { cors: true, logging: false })
```

### API Key Management

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

### Middleware

#### `authMiddleware()`

Authentication middleware for Hono routes. Validates Bearer tokens and attaches payload to context.

```typescript
import { Hono } from 'hono'
import { authMiddleware, type AuthVariables } from '@macts/api'

const app = new Hono<{ Variables: AuthVariables }>()

// Apply to all /api routes
app.use('/api/*', authMiddleware())

app.get('/api/protected', (c) => {
  const payload = c.get('apiKeyPayload')
  return c.json({ keyId: payload.sub })
})
```

**Error responses:**

```typescript
interface AuthErrorResponse {
  error: {
    code:
      | 'MISSING_AUTHORIZATION'
      | 'INVALID_AUTH_SCHEME'
      | 'INVALID_FORMAT'
      | 'INVALID_SIGNATURE'
      | 'EXPIRED'
      | 'REVOKED'
      | 'MALFORMED_PAYLOAD'
    message: string
  }
}
```

#### `requirePermission(permission, options?)`

Permission checking middleware. Must be used after `authMiddleware()`.

```typescript
import { requirePermission } from '@macts/api'

app.post(
  '/api/rpc/calendar.events.create',
  authMiddleware(),
  requirePermission('calendar:events:create'),
  (c) => {
    // User has permission, handle request
  }
)
```

**With permission history (for helpful error messages):**

```typescript
app.post(
  '/api/rpc/calendar.events.create',
  authMiddleware(),
  requirePermission('calendar:events:create', {
    permissionHistory: manifest.permissions?.history,
  }),
  handler
)
```

**Error response:**

```typescript
interface PermissionErrorResponse {
  error: {
    code: 'PERMISSION_DENIED'
    message: string
    required: string // Required permission
    hint?: string // Helpful hint
    changelog?: {
      // If permission was renamed
      version: string
      previousPermission: string
      reason?: string
    }
  }
}
```

#### `rpcPathToPermission(path)`

Utility to convert RPC path to permission string.

```typescript
// '/rpc/calendar.events.list' -> 'calendar:events:list'
const permission = rpcPathToPermission('/rpc/calendar.events.list')
```

### RPC Handlers

RPC endpoints are automatically generated from manifest commands. Each command becomes a `POST /api/v1/rpc/{app}.{resource}.{operation}` endpoint.

#### `createRpcRouter(manifest)`

Create a Hono router with RPC endpoints from a manifest.

```typescript
import { createRpcRouter } from '@macts/api'

const rpcRouter = createRpcRouter(manifest)
app.route('/api/v1', rpcRouter)
```

#### `createMultiAppRpcRouter(manifests)`

Create a router for multiple apps.

```typescript
const rpcRouter = createMultiAppRpcRouter([calendarManifest, remindersManifest])
```

**RPC Request:**

```typescript
interface RpcRequest {
  [key: string]: unknown // Command arguments
}
```

**RPC Success Response:**

```typescript
interface RpcSuccessResponse<T = unknown> {
  result: T
}
```

**RPC Error Response:**

```typescript
interface RpcErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
```

### JXA Bridge

The JXA bridge provides the execution layer for macOS automation via JavaScript for Automation.

#### `runJxa(code, options?)`

Execute JXA code and return the result.

```typescript
import { runJxa } from '@macts/api'

const result = await runJxa(`
  const app = Application('Calendar');
  return app.calendars().map(c => c.name());
`)

console.log('Calendars:', result)
```

#### `runWithApp(bundleId, code, options?)`

Execute JXA code with an app connection.

```typescript
import { runWithApp } from '@macts/api'

const calendars = await runWithApp(
  'com.apple.iCal',
  `
  const app = Application.currentApplication();
  app.includeStandardAdditions = true;

  const Calendar = Application('Calendar');
  return Calendar.calendars().map(c => ({
    name: c.name(),
    color: c.color()
  }));
`
)
```

#### `connect(bundleId, options?)`

Create a persistent connection to a macOS app.

```typescript
import { connect, type AppConnection } from '@macts/api'

const cal: AppConnection = await connect('com.apple.iCal', {
  autoActivate: true,
  checkRunning: true,
})

// Use the connection
const result = await cal.run(`
  return Application('Calendar').calendars().length;
`)

// Close when done
await cal.close()
```

#### App Control

```typescript
import { isAppRunning, activateApp, quitApp, getAppName } from '@macts/api'

// Check if app is running
const running = await isAppRunning('com.apple.iCal')

// Get app name
const name = await getAppName('com.apple.iCal')
console.log(name) // "Calendar"

// Activate (bring to front)
await activateApp('com.apple.iCal')

// Quit app
await quitApp('com.apple.iCal')
```

#### Object Specifiers

Build type-safe object specifiers for JXA queries.

```typescript
import { ObjectSpecifier } from '@macts/api'

// Build: Application('Calendar').calendars.whose({name: 'Work'})
const spec = new ObjectSpecifier('Calendar').elements('calendars').whose({ name: 'Work' })

console.log(spec.build())
```

#### Type Coercers

Convert between JavaScript and JXA types.

```typescript
import {
  dateCoercer,
  colorCoercer,
  createEnumCoercer,
  pathCoercer,
  booleanCoercer,
  numberCoercer,
  stringCoercer,
  createArrayCoercer,
  nullSafe,
} from '@macts/api'

// Date coercion
const date = dateCoercer.toJs(new Date())
const jsDate = dateCoercer.fromJs('2026-02-17T10:00:00Z')

// Color coercion (hex <-> RGB)
const rgb = colorCoercer.toJs('#FF0000') // [255, 0, 0]
const hex = colorCoercer.fromJs([255, 0, 0]) // '#ff0000'

// Enum coercion
const statusCoercer = createEnumCoercer({
  accepted: 'accepted',
  declined: 'declined',
  tentative: 'tentative',
})

// Array coercion
const arrayOfDates = createArrayCoercer(dateCoercer)
const dates = arrayOfDates.fromJs(['2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z'])

// Null-safe coercion
const optionalDate = nullSafe(dateCoercer)
const maybeDate = optionalDate.fromJs(null) // undefined
```

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
  "version": "1.0.0",
  "apps": ["calendar"]
}
```

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

{
  "arg1": "value1",
  "arg2": "value2"
}
```

**Success Response:**

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
    "required": "calendar:events:create"
  }
}
```

## Error Codes

The API uses standardized error codes across all endpoints. Each error response includes a `code`, `message`, and optionally additional details.

### Authentication Errors (401)

Returned by the `authMiddleware` when token validation fails.

#### `MISSING_AUTHORIZATION`

No `Authorization` header was provided in the request.

**Example Response:**

```json
{
  "error": {
    "code": "MISSING_AUTHORIZATION",
    "message": "Authorization header is required"
  }
}
```

**How to fix:** Include an `Authorization: Bearer macts_sk_...` header in your request.

#### `INVALID_AUTH_SCHEME`

The `Authorization` header doesn't use the Bearer scheme.

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_AUTH_SCHEME",
    "message": "Authorization header must use Bearer scheme"
  }
}
```

**How to fix:** Use `Authorization: Bearer <token>` instead of other schemes like Basic or custom formats.

#### `INVALID_FORMAT`

The token doesn't have the correct format (must start with `macts_sk_`).

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_FORMAT",
    "message": "Invalid token format: must start with macts_sk_"
  }
}
```

**How to fix:** Verify you're using a token generated by `createApiKey()`. Tokens always start with `macts_sk_`.

#### `INVALID_SIGNATURE`

The JWT signature verification failed.

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Invalid token signature"
  }
}
```

**How to fix:** This means the token was tampered with or was signed with a different secret. Generate a new token.

#### `EXPIRED`

The token has passed its expiration time.

**Example Response:**

```json
{
  "error": {
    "code": "EXPIRED",
    "message": "Token has expired"
  }
}
```

**How to fix:** Create a new API key with a new expiration date.

#### `REVOKED`

The token has been explicitly revoked.

**Example Response:**

```json
{
  "error": {
    "code": "REVOKED",
    "message": "Token has been revoked"
  }
}
```

**How to fix:** Create a new API key. Revoked keys cannot be un-revoked.

#### `MALFORMED_PAYLOAD`

The token payload doesn't match the expected structure.

**Example Response:**

```json
{
  "error": {
    "code": "MALFORMED_PAYLOAD",
    "message": "Malformed token payload"
  }
}
```

**How to fix:** Generate a new token using `createApiKey()`. This error indicates a corrupted or manually-crafted token.

### Permission Errors (403)

Returned by `requirePermission` middleware when the authenticated user lacks required permissions.

#### `PERMISSION_DENIED`

The token doesn't have the required permission for the operation.

**Example Response:**

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Missing required permission: calendar:events:create",
    "required": "calendar:events:create",
    "hint": "You need permission: calendar:events:create"
  }
}
```

**With changelog (if permission was renamed):**

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Missing required permission: calendar:events:create",
    "required": "calendar:events:create",
    "hint": "This permission was previously named calendar:events:add",
    "changelog": {
      "version": "2.0.0",
      "previousPermission": "calendar:events:add",
      "reason": "Renamed for consistency"
    }
  }
}
```

**How to fix:** Create a new API key with the required permission, or update an existing key's permissions (requires revoking and recreating).

### RPC Errors (400/500)

Returned by RPC endpoint handlers.

#### `INVALID_REQUEST` (400)

The request body is not valid JSON.

**Example Response:**

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request body must be valid JSON"
  }
}
```

**How to fix:** Ensure your request has `Content-Type: application/json` and a valid JSON body.

#### `VALIDATION_ERROR` (400)

The request body doesn't match the command's parameter schema.

**Example Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "number",
        "path": ["title"],
        "message": "Expected string, received number"
      }
    ]
  }
}
```

**How to fix:** Review the `details` array to see which parameters are invalid. Check the manifest or API documentation for parameter requirements.

#### `EXECUTION_ERROR` (500)

The JXA command execution failed.

**Example Response:**

```json
{
  "error": {
    "code": "EXECUTION_ERROR",
    "message": "Command execution failed: Calendar is not running"
  }
}
```

**How to fix:** Common causes include:

- The target app is not running
- The app doesn't have the required permissions (check System Settings > Privacy & Security > Automation)
- Invalid parameters passed to the JXA command
- The app is in an unexpected state

### Server Errors

#### `INTERNAL_ERROR` (500)

An unexpected server error occurred.

**Example Response (production):**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

**Example Response (development):**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Cannot read property 'name' of undefined"
  }
}
```

**How to fix:** Check server logs for details. In production, error messages are sanitized for security.

#### `NOT_FOUND` (404)

The requested endpoint doesn't exist.

**Example Response:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found: POST /api/v1/rpc/calendar.foo.bar"
  }
}
```

**How to fix:** Verify the endpoint path matches a defined RPC route. Use `GET /api/v1/introspect` to see available endpoints.

#### `RATE_LIMIT_EXCEEDED` (429)

Too many requests in the rate limit window.

**Example Response:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

**How to fix:** Wait for the specified `retryAfter` seconds before making another request. Consider adjusting rate limits in server configuration or distributing requests over time.

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

**Symptom:** `INVALID_FORMAT` error even though token looks correct

**Cause:** Token is not prefixed with `macts_sk_` or is truncated.

**Solution:**

- Verify the token starts with `macts_sk_`
- Check that the full token was copied (tokens are long, around 200+ characters)
- Ensure no whitespace or newlines were added when copying

#### Expired Keys

**Symptom:** `EXPIRED` error code

**Cause:** Token expiration time has passed.

**Solution:**

- Create a new API key
- List existing keys to check expiration: `listApiKeys()`
- Use longer expiration times or no expiration for persistent keys

#### Wrong Signing Secret

**Symptom:** `INVALID_SIGNATURE` error on a valid-looking token

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

**Symptom:** `RATE_LIMIT_EXCEEDED` error code

**Cause:** Exceeded the configured rate limit (default: 100 requests/minute per API key).

**Solution:**

1. Wait for the `retryAfter` period specified in the error
2. Adjust rate limits in server configuration:
   ```typescript
   createServer(manifest, {
     rateLimit: {
       maxRequests: 1000,
       windowMs: 60_000, // 1 minute
     },
   })
   ```
3. Disable rate limiting (not recommended for production):
   ```typescript
   createServer(manifest, { rateLimit: false })
   ```

### JXA Execution Errors

#### App Not Running

**Symptom:** `EXECUTION_ERROR: Calendar is not running`

**Cause:** Target macOS app is not currently running.

**Solution:**

- Launch the app manually or programmatically with `activateApp(bundleId)`
- Check if app is running with `isAppRunning(bundleId)` before commands

#### Permission Not Granted

**Symptom:** `EXECUTION_ERROR: Not authorized to send Apple events to Calendar`

**Cause:** Your Node.js process doesn't have Automation permission for the target app.

**Solution:**

1. Open **System Settings > Privacy & Security > Automation**
2. Find your Node.js runtime (Node, Terminal, iTerm, etc.)
3. Check the box next to the target app (Calendar, Reminders, etc.)
4. Restart the server after granting permission

#### App in Unexpected State

**Symptom:** Various `EXECUTION_ERROR` messages about missing properties or invalid operations

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

Permissions are expanded at key creation time, not at validation time:

- **Coarse permissions** (e.g., `calendar:events:read`) expand to all matching fine-grained permissions (e.g., `calendar:events:list`, `calendar:events:get`)
- **Wildcard permissions** (e.g., `calendar:*:read`) expand to all matching operations
- **Fine-grained permissions** (e.g., `calendar:events:list`) are stored as-is

This means:

- Keys contain an explicit list of fine-grained permissions
- You can't grant new permissions to existing keys by updating the manifest
- Revoking a permission in the manifest doesn't affect existing keys

To apply permission changes, revoke and recreate the key.

### Token Expiration

Set expiration times for API keys when possible:

```typescript
// Expire in 30 days
const key = await createApiKey({
  name: 'temporary',
  permissions: ['calendar:*:read'],
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
// Main export (includes everything)
import { createServer, createApiKey, runJxa } from '@macts/api'

// Server-only export
import { createServer, authMiddleware, requirePermission } from '@macts/api/server'

// Keys-only export
import { createApiKey, validateApiKey, revokeApiKey } from '@macts/api/keys'
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

JXA execution errors are wrapped in `JxaExecutionError`:

```typescript
import { runJxa, JxaExecutionError } from '@macts/api'

try {
  await runJxa('invalid javascript')
} catch (error) {
  if (error instanceof JxaExecutionError) {
    console.error('JXA error:', error.message)
    console.error('Exit code:', error.exitCode)
    console.error('stderr:', error.stderr)
  }
}
```

## License

MIT
