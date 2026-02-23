# Phase 8: HTTP API Infrastructure

## Goal

Build the HTTP API server (`@macts/api`) using Hono, and the plugin generation system that produces app-specific API routers (`@macts/api-<app>`).

## Key Deliverables

1. **Core HTTP Server (@macts/api)**
   - Hono-based HTTP server
   - Plugin discovery: finds installed `@macts/api-*` packages
   - Router composition from plugins
   - OpenAPI spec generation
   - CORS configuration
   - Error handling middleware

2. **Plugin System**
   - Plugin interface that api-<app> packages implement
   - Dynamic loading and router mounting
   - App routes mounted at `/<app>/` prefix

3. **API Generator**
   - Generate `@macts/api-<app>` packages from manifests
   - REST routes from hierarchy
   - Request/response validation
   - OpenAPI schema generation

4. **Route Structure**

   ```
   GET     /<app>/<plural>                    → list
   GET     /<app>/<plural>/:id                → get
   POST    /<app>/<plural>                    → create
   PATCH   /<app>/<plural>/:id                → update
   DELETE  /<app>/<plural>/:id                → delete
   GET     /<app>/<plural>/:id/<child>        → list children
   POST    /<app>/<plural>/:id/<child>        → create child
   POST    /<app>/actions/<command>           → app command
   POST    /<app>/<plural>/:id/actions/<cmd>  → resource command
   ```

5. **OpenAPI Generation**
   - Generate OpenAPI 3.1 spec from manifest
   - Include all routes with schemas
   - Serve at `/<app>/openapi.json`
   - Swagger UI at `/<app>/docs`

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas)
- Phase 4 (SDK generation patterns)
- Phase 5 (Calendar SDK)

## Critical Files

```
packages/api/
├── package.json
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Hono server setup
│   ├── plugin-loader.ts      # Plugin discovery
│   ├── middleware/
│   │   ├── cors.ts           # CORS handling
│   │   ├── error.ts          # Error handling
│   │   └── validation.ts     # Request validation
│   └── openapi/
│       └── swagger-ui.ts     # Swagger UI serving

packages/core/src/
├── generator/
│   └── api/
│       ├── index.ts          # generateApiPlugin()
│       ├── routes.ts         # Generate route handlers
│       ├── openapi.ts        # Generate OpenAPI spec
│       └── package.ts        # Generate package structure

packages/api-calendar/        # Generated plugin
├── package.json
├── src/
│   ├── index.ts              # Plugin export
│   ├── plugin.ts             # Plugin implementation (Hono router)
│   ├── routes/
│   │   ├── calendars.ts      # /calendar/calendars routes
│   │   ├── events.ts         # /calendar/calendars/:id/events routes
│   │   └── actions.ts        # /calendar/actions routes
│   └── openapi.ts            # OpenAPI spec
```

## Calendar API Routes

```
# Calendars
GET     /calendar/calendars                           → list calendars
GET     /calendar/calendars/:uid                      → get calendar
POST    /calendar/calendars                           → create calendar
PATCH   /calendar/calendars/:uid                      → update calendar
DELETE  /calendar/calendars/:uid                      → delete calendar

# Events (nested under calendars)
GET     /calendar/calendars/:uid/events               → list events
GET     /calendar/calendars/:uid/events/:eventUid     → get event
POST    /calendar/calendars/:uid/events               → create event
PATCH   /calendar/calendars/:uid/events/:eventUid     → update event
DELETE  /calendar/calendars/:uid/events/:eventUid     → delete event

# Attendees (read-only)
GET     /calendar/calendars/:uid/events/:eventUid/attendees

# App commands
POST    /calendar/actions/reload-calendars
POST    /calendar/actions/switch-view                 → body: { to: "week" }

# Resource commands
POST    /calendar/calendars/:uid/events/:eventUid/actions/show

# OpenAPI
GET     /calendar/openapi.json
GET     /calendar/docs                                → Swagger UI
```

## Plugin Interface

```typescript
// @macts/api exports this interface
interface ApiPlugin {
  name: string // 'calendar'
  description: string
  router: Hono // Hono router instance
  openApiSpec: OpenAPIObject
}
```

## Generated Route Example

```typescript
// Generated: calendars.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { Calendar, CalendarCreateInputSchema } from '@macts/sdk-calendar'

const router = new Hono()

// GET /calendars
router.get('/', async (c) => {
  const app = new Calendar()
  const calendars = await app.calendars.list()
  return c.json({ calendars })
})

// GET /calendars/:uid
router.get('/:uid', async (c) => {
  const { uid } = c.req.param()
  const app = new Calendar()
  const calendar = await app.calendars.get(uid)
  return c.json({ calendar })
})

// POST /calendars
router.post('/', zValidator('json', CalendarCreateInputSchema), async (c) => {
  const input = c.req.valid('json')
  const app = new Calendar()
  const calendar = await app.calendars.create(input)
  return c.json({ calendar }, 201)
})

// PATCH /calendars/:uid
router.patch('/:uid', zValidator('json', CalendarUpdateInputSchema), async (c) => {
  const { uid } = c.req.param()
  const input = c.req.valid('json')
  const app = new Calendar()
  const calendar = await app.calendars.get(uid)
  await calendar.update(input)
  return c.json({ calendar })
})

// DELETE /calendars/:uid
router.delete('/:uid', async (c) => {
  const { uid } = c.req.param()
  const app = new Calendar()
  const calendar = await app.calendars.get(uid)
  await calendar.delete()
  return c.json({ success: true })
})

export { router as calendarsRouter }
```

## Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;           // 'NOT_FOUND', 'VALIDATION_ERROR', 'JXA_ERROR'
    message: string;
    details?: unknown;      // Validation errors, etc.
  };
}

// Example responses
// 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Calendar with uid 'abc123' not found"
  }
}

// 400 Validation Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "path": ["name"], "message": "Required" }
    ]
  }
}
```

## Success Criteria

- [ ] HTTP server starts on configurable port
- [ ] Plugin discovery loads installed @macts/api-\* packages
- [ ] All CRUD routes work for Calendar
- [ ] Request bodies validated against schemas
- [ ] Proper HTTP status codes (201 for create, 404 for not found, etc.)
- [ ] OpenAPI spec generated and accurate
- [ ] Swagger UI accessible at /calendar/docs
- [ ] Error responses are consistent and informative
- [ ] CORS headers allow browser access
- [ ] `macts --serve --port 3456` starts the server
