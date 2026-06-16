**Status:** Draft

**Author:** Mike

**Date:** February 15, 2026

**Related:** Trust & governance layer

**Repo:** [github.com/mike-north/macts](http://github.com/mike-north/macts)

**GitHub Org:** [github.com/mac-ts](http://github.com/mac-ts)

**npm:** `@macts/*` scope, `macts` package

---

# Product Principles

**1. AppleScript and JXA are invisible.** These are implementation details, not user-facing concepts. No user of any macts package — SDK, CLI, MCP, HTTP API, or SQL — should ever need to know that AppleScript or JXA exist. No AppleScript terminology, syntax, or mental model should leak through any surface. If a user opens a GitHub issue saying "I don't understand how the AppleScript part works," we have failed.

**2. SDKs must feel hand-crafted.** The TypeScript SDKs must feel as if a senior engineer carefully designed an idiomatic SDK surface for each application — not like auto-generated bindings. When determining the right API surface for an app, compare against existing official APIs where they exist (e.g., Spotify's dictionary should be compared against [Spotify's Web API](https://developer.spotify.com/documentation/web-api), OmniFocus's dictionary against its [Omni Automation API](https://omni-automation.com/omnifocus/)). The goal is the best possible developer experience, not the most faithful translation of the dictionary.

**3. Manifests are lossless-plus.** The manifest folders must be a lossless representation of the source dictionary files — and should include _even more_ information than the dictionaries contain (runtime-probed types, app icons, TCC entitlements, confidence scores, open questions). The manifest must contain sufficient information to generate rich TypeScript SDKs, CLIs, MCP tools, HTTP APIs, SQL interfaces, and agent skills without consulting any other source.

**4. Agent-driven, human-reviewed.** The process of creating a manifest from a dictionary must be agent-driven and human-reviewed. Relentlessly cater to Claude Code and use the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). The extraction agent should do the heavy lifting; humans should review, answer open questions, and approve. The agent's output must include confidence scores and structured open questions so reviewers know exactly where to focus.

**5. No contributor has every app.** Assume no single contributor has every macOS application installed. The project must support distributed contributions where each contributor works with the apps they own. Real-application testing cannot happen in CI — use [attest-it](https://github.com/mike-north/attest-it) so that locally-run (but fully automated) tests produce validation seals that are enforced in CI and automatically invalidated when relevant files change. This ensures that manifest accuracy is verified against real apps without requiring CI to have those apps installed.

---

# Project Identity

**Name:** macts (macOS Automation TypeScript)

**CLI binary:** `macts`

**npm scope:** `@macts/*`

## Package Architecture

```
@macts/core                    # Manifest parsing, shared runtime, JXA bridge
@macts/cli                     # Core CLI binary (macts)
@macts/mcp                     # Core MCP server
@macts/api                     # Core HTTP API server (Hono)
@macts/sql                     # Core SQL interface (reserved)

@macts/sdk-calendar            # TypeScript SDK for Calendar
@macts/sdk-omnifocus           # TypeScript SDK for OmniFocus
@macts/sdk-spotify             # TypeScript SDK for Spotify
@macts/sdk-<app_name>          # TypeScript SDK for any app

@macts/cli-calendar            # CLI plugin: enables `macts calendar *`
@macts/cli-omnifocus           # CLI plugin: enables `macts omnifocus *`
@macts/cli-<app_name>          # CLI plugin for any app

@macts/mcp-calendar            # MCP plugin: exposes Calendar-specific tools
@macts/mcp-omnifocus           # MCP plugin: exposes OmniFocus-specific tools
@macts/mcp-<app_name>          # MCP plugin for any app

@macts/api-calendar            # HTTP API plugin: Hono router for Calendar
@macts/api-omnifocus           # HTTP API plugin: Hono router for OmniFocus
@macts/api-<app_name>          # HTTP API plugin for any app

@macts/sql-calendar            # SQL plugin for Calendar (reserved)
@macts/sql-<app_name>          # SQL plugin for any app (reserved)
```

### Dependency Graph

```
@macts/sdk-<app>       ← Generated from manifest, wraps JXA via @macts/core
    ↑
@macts/cli-<app>       ← Generated from manifest + delegates to SDK
@macts/mcp-<app>       ← Generated from manifest + delegates to SDK
@macts/api-<app>       ← Generated from manifest + delegates to SDK
@macts/sql-<app>       ← Generated from manifest + hybrid (reads: JXA direct, writes: SDK)
    ↑
@macts/cli             ← Core binary, discovers and loads cli-<app> plugins
@macts/mcp             ← Core server, discovers and loads mcp-<app> plugins
@macts/api             ← Core Hono server, discovers and loads api-<app> routers
@macts/sql             ← Core SQL engine, discovers and loads sql-<app> plugins
```

### Plugin Discovery

The core packages (`@macts/cli`, `@macts/mcp`, `@macts/api`, `@macts/sql`) discover app-specific plugins at runtime. Installing `@macts/cli-spotify` automatically makes `macts spotify *` available in the CLI. The core packages have zero app-specific knowledge — all app behavior comes from plugins.

### CLI Usage

```bash
# Install core CLI + an app plugin
npm install -g @macts/cli @macts/cli-calendar

# Now available:
macts calendar calendars list
macts calendar calendars <id> events list
macts calendar calendars <id> events create --summary "Standup" --start-date 2026-02-16T09:00
macts calendar reload-calendars

# MCP server mode
macts calendar --mcp

# Or run the unified MCP server with all installed plugins
macts --mcp

# HTTP API server
macts --serve --port 3456
```

---

# Purpose

This document defines the **app manifest** format that macts produces from AppleScript/JXA dictionary files. The manifest is the single source of truth from which all integration surfaces are deterministically generated: TypeScript SDK, CLI, MCP server, HTTP API, and SQL-like query interface.

The manifest must be rich enough that generation is fully automated with zero human intervention per surface. It must support runtime validation with informative error messages. It must preserve the full semantic richness of the source dictionary without loss.

---

# Design Principles

**1. Lossless enrichment.** The manifest captures everything in the source dictionary XML and adds structure on top. Nothing from the original is discarded.

**2. Runtime-first.** Data shapes are expressed as JSON Schema (generated from Zod schemas at build time). This enables runtime validation with clear error messages across all surfaces.

**3. Generation-complete.** Every integration surface can be generated from the manifest alone. No additional information is needed at generation time.

**4. Human-readable.** The manifest should be reviewable by a human. YAML for structural/relational information, JSON Schema files for data shapes.

**5. No permissions, no classification.** The manifest is purely structural and syntactic. It describes what exists and how to call it. What it _means_ semantically and what should be _allowed_ are concerns for the trust & governance layer.

---

# Manifest Structure

Each app produces a manifest folder:

```jsx
manifests/
└── calendar/
    ├── app.yaml              # App metadata, hierarchy, commands, relationships
    ├── schemas/
    │   ├── resources/
    │   │   ├── calendar.json  # JSON Schema for Calendar resource
    │   │   ├── event.json     # JSON Schema for Event resource
    │   │   ├── attendee.json  # JSON Schema for Attendee resource
    │   │   └── alarm.json     # JSON Schema for Alarm resource (union type)
    │   ├── commands/
    │   │   ├── create-calendar.input.json
    │   │   ├── create-calendar.output.json
    │   │   ├── switch-view.input.json
    │   │   ├── switch-view.output.json
    │   │   ├── make.input.json
    │   │   ├── make.output.json
    │   │   └── ...
    │   └── enums/
    │       ├── participation-status.json
    │       ├── event-status.json
    │       └── view-type.json
    └── source.sdef            # Original dictionary (for provenance)
```

---

# app.yaml — The Core Manifest

This is the primary file that describes the app's object model, hierarchy, commands, and relationships.

## Top-Level Structure

```yaml
version: '1.0'
app:
  name: Calendar
  bundleId: com.apple.iCal
  description: 'macOS Calendar application'
  source:
    type: sdef
    path: source.sdef
    extractedAt: '2026-02-15T00:00:00Z'
    appVersion: '14.0'

resources: { ... } # Resource type definitions
commands: { ... } # Command definitions
enums: { ... } # Enumeration definitions
hierarchy: { ... } # Containment tree
relationships: [...] # Non-hierarchical references
```

## Resources

Each resource type represents an AppleScript class that has identity and can be contained by other resources.

```yaml
resources:
  calendar:
    name: Calendar
    plural: calendars
    description: 'A calendar that contains events.'
    schema: schemas/resources/calendar.json

    # Property access modes — critical for knowing what's readable vs writable
    properties:
      name:
        access: rw
        description: 'The calendar title.'
      uid:
        access: r
        description: 'A unique calendar key.'
      color:
        access: rw
        description: 'The calendar color.'
      writable:
        access: r
        description: 'Whether the calendar is writable.'
      description:
        access: rw
        description: 'The calendar description.'

    # Which commands can target this resource
    respondsto:
      - make
      - delete
      - show

  event:
    name: Event
    plural: events
    description: 'A calendar event.'
    schema: schemas/resources/event.json

    properties:
      summary:
        access: rw
        description: 'The event summary/title.'
      description:
        access: rw
        description: 'The event notes.'
      startDate:
        access: rw
        type: date
        description: 'The event start date.'
      endDate:
        access: rw
        type: date
        description: 'The event end date.'
      alldayEvent:
        access: rw
        type: boolean
        description: 'True if this is an all-day event.'
      recurrence:
        access: rw
        type: string
        description: 'iCalendar RFC 2445 recurrence string.'
      location:
        access: rw
        type: string
        description: 'The event location.'
      url:
        access: rw
        type: string
        description: 'The URL associated with the event.'
      uid:
        access: r
        type: string
        description: 'A unique event key.'
      status:
        access: r
        type: enum
        enum: event-status
        description: 'The event status.'
      sequence:
        access: r
        type: number
        description: 'The event version.'
      stampDate:
        access: r
        type: date
        description: 'The event modification date.'
      excludedDates:
        access: rw
        type: 'date[]'
        description: 'The exception dates.'

    respondsto:
      - make
      - delete
      - show

  attendee:
    name: Attendee
    plural: attendees
    description: 'An event attendee.'
    schema: schemas/resources/attendee.json

    properties:
      displayName:
        access: r
        description: 'The first and last name of the attendee.'
      email:
        access: r
        description: 'The email of the attendee.'
      participationStatus:
        access: r
        type: enum
        enum: participation-status
        description: 'The invitation status for the attendee.'

    respondsto: []

  display-alarm:
    name: DisplayAlarm
    plural: displayAlarms
    description: 'A display/message alarm.'
    schema: schemas/resources/alarm.json
    alarmType: display

    properties:
      triggerInterval:
        access: rw
        type: number
        description: 'Minutes between event and alarm. Negative for before, positive for after.'
      triggerDate:
        access: rw
        type: date
        description: 'An absolute alarm date.'

    respondsto:
      - make
      - delete
```

## Hierarchy

The containment tree. This drives REST path generation, CLI subcommand nesting, SQL foreign keys, and MCP tool scoping.

```yaml
hierarchy:
  application:
    children:
      - resource: calendar
        access: rw # Can create and delete calendars

  calendar:
    children:
      - resource: event
        access: rw # Can create and delete events in a calendar

  event:
    children:
      - resource: attendee
        access: r # Attendees are read-only (managed by invitations)
      - resource: display-alarm
        access: rw
      - resource: mail-alarm
        access: rw
      - resource: sound-alarm
        access: rw
      - resource: open-file-alarm
        access: rw
```

From this hierarchy, generation can deterministically produce:

**CLI paths:**

```jsx
macts calendar calendars list
macts calendar calendars <id> events list
macts calendar calendars <id> events <id> attendees list
macts calendar calendars <id> events <id> alarms list
```

**HTTP routes:**

```jsx
GET    /calendars
GET    /calendars/:calendarId
POST   /calendars
GET    /calendars/:calendarId/events
GET    /calendars/:calendarId/events/:eventId
POST   /calendars/:calendarId/events
GET    /calendars/:calendarId/events/:eventId/attendees
```

**SQL tables:**

```jsx
calendars (id, name, color, uid, writable, description)
events (id, calendar_id FK, summary, start_date, end_date, ...)
attendees (id, event_id FK, display_name, email, participation_status)
alarms (id, event_id FK, type, trigger_interval, trigger_date, ...)
```

**MCP tools:**

```jsx
macts__calendar__calendars_list
macts__calendar__calendars_get
macts__calendar__calendars_create
macts__calendar__events_list
macts__calendar__events_get
macts__calendar__events_create
macts__calendar__attendees_list
```

## Commands

Commands are operations that go beyond CRUD. CRUD operations (list, get, create, update, delete) are derived automatically from the hierarchy and property access modes. Commands represent additional verbs.

```yaml
commands:
  reload-calendars:
    name: reloadCalendars
    description: 'Reload all calendar files contents.'
    scope: application # Operates on the app, not a specific resource
    input: null # No arguments
    output: null # No return value

  switch-view:
    name: switchView
    description: 'Show calendar on the given view.'
    scope: application
    input: schemas/commands/switch-view.input.json
    output: null

  view-calendar:
    name: viewCalendar
    description: 'Show calendar on the given date.'
    scope: application
    input: schemas/commands/view-calendar.input.json
    output: null

  get-url:
    name: getURL
    description: 'Subscribe to a remote calendar through a webcal or http URL.'
    scope: application
    input: schemas/commands/get-url.input.json
    output: null

  show:
    name: show
    description: 'Show the event or to-do in the calendar window.'
    scope: resource # Operates on a specific resource instance
    targetResources: # Which resource types this can target
      - event
    input: null # The direct parameter is the resource itself
    output: null
```

From commands, generation produces:

**CLI:**

```jsx
macts calendar reload-calendars
macts calendar switch-view --to day
macts calendar calendars <id> events <id> show
```

**HTTP:**

```jsx
POST /actions/reload-calendars
POST /actions/switch-view
POST /calendars/:calendarId/events/:eventId/actions/show
```

**MCP:**

```jsx
macts__calendar__reload_calendars
macts__calendar__switch_view
macts__calendar__events_show
```

## Enums

Enumeration definitions. Referenced by property types and command parameters.

```yaml
enums:
  participation-status:
    name: ParticipationStatus
    description: 'The invitation status for an attendee.'
    schema: schemas/enums/participation-status.json
    values:
      - name: accepted
        description: 'The attendee has accepted.'
      - name: declined
        description: 'The attendee has declined.'
      - name: tentative
        description: 'The attendee has tentatively accepted.'
      - name: pending
        description: 'No response yet.'

  event-status:
    name: EventStatus
    description: 'The status of a calendar event.'
    schema: schemas/enums/event-status.json
    values:
      - name: confirmed
      - name: tentative
      - name: cancelled

  view-type:
    name: ViewType
    description: 'Calendar view modes.'
    schema: schemas/enums/view-type.json
    values:
      - name: day
      - name: week
      - name: month
      - name: year
```

## Relationships

Non-hierarchical references between resources. These are cases where one resource references another without a parent-child containment relationship.

```yaml
relationships: []
# Calendar is simple — no cross-references.
# A more complex app like OmniFocus might have:
# - type: reference
#   from: task
#   to: tag
#   cardinality: many-to-many
#   description: "Tasks can have multiple tags, tags apply to multiple tasks."
```

---

# JSON Schema Files

Each schema file is a standard JSON Schema document that can be used for runtime validation. These are generated from Zod schemas at build time.

## Resource Schema Example

`schemas/resources/calendar.json` would contain:

```json
{
  "$id": "tapplescript://calendar/resources/calendar",
  "type": "object",
  "title": "Calendar",
  "description": "A calendar that contains events.",
  "properties": {
    "name": {
      "type": "string",
      "description": "The calendar title."
    },
    "uid": {
      "type": "string",
      "description": "A unique calendar key.",
      "readOnly": true
    },
    "color": {
      "type": "string",
      "description": "The calendar color."
    },
    "writable": {
      "type": "boolean",
      "description": "Whether the calendar is writable.",
      "readOnly": true
    },
    "description": {
      "type": ["string", "null"],
      "description": "The calendar description."
    }
  },
  "required": ["name", "uid"]
}
```

## Command Input Schema Example

`schemas/commands/switch-view.input.json`:

```json
{
  "$id": "tapplescript://calendar/commands/switch-view/input",
  "type": "object",
  "title": "SwitchViewInput",
  "description": "Arguments for the switchView command.",
  "properties": {
    "to": {
      "$ref": "../enums/view-type.json",
      "description": "The calendar view to display."
    }
  },
  "required": ["to"]
}
```

## Enum Schema Example

`schemas/enums/view-type.json`:

```json
{
  "$id": "tapplescript://calendar/enums/view-type",
  "type": "string",
  "title": "ViewType",
  "description": "Calendar view modes.",
  "enum": ["day", "week", "month", "year"]
}
```

---

# Generation Rules

These rules define how each surface is deterministically produced from the manifest.

## CRUD Derivation

CRUD operations are not explicitly listed as commands. They are derived from the hierarchy and property access:

- If a resource appears in `hierarchy[parent].children` with `access: rw`, it gets **create** and **delete** operations
- If a resource appears in `hierarchy[parent].children` with `access: r`, it gets **list** and **get** only
- If a resource has any properties with `access: rw`, it gets an **update** operation
- All resources get **list** and **get** operations

## CLI Generation

The CLI tree mirrors the hierarchy:

```jsx
macts <app> <resource-plural> list [--filter-field value ...]
macts <app> <resource-plural> <id> get
macts <app> <resource-plural> create --field value ...
macts <app> <resource-plural> <id> update --field value ...
macts <app> <resource-plural> <id> delete
macts <app> <resource-plural> <id> <child-plural> list
macts <app> <resource-plural> <id> <command-name> [--param value ...]
macts <app> <app-command-name> [--param value ...]
```

Argument types from JSON Schema map to CLI flag types: string flags, number flags, boolean flags, enum flags (with tab completion from enum values), date flags (with ISO 8601 parsing).

Required properties in the schema become required CLI flags. Optional properties become optional flags.

## HTTP API Generation

REST routes follow the hierarchy:

```
GET     /<plural>                          → list
GET     /<plural>/:id                      → get
POST    /<plural>                          → create
PATCH   /<plural>/:id                      → update
DELETE  /<plural>/:id                      → delete
GET     /<plural>/:id/<child-plural>       → list children
POST    /<plural>/:id/actions/<command>    → invoke command
POST    /actions/<app-command>             → invoke app-level command
```

Request bodies are validated against input schemas. Response bodies conform to resource schemas or command output schemas.

## MCP Tool Generation

Tool names follow the pattern: `macts__<app>__<resource>_<operation>`

Tool input schemas are the JSON Schema files directly. Tool descriptions come from the resource/command descriptions in app.yaml.

## SQL Interface Generation

The SQL interface is architecturally distinct from the other surfaces. While CLI, MCP, and HTTP API all delegate execution to the SDK, the SQL interface uses a **hybrid approach**.

**Reads go directly to JXA.** AppleScript/JXA natively supports filtered traversal through `whose` clauses (e.g., "every event of calendar 1 whose allday_event is true"). These map naturally to SQL WHERE semantics and are more efficient than fetching everything through the SDK and filtering in memory. The SQL query parser translates SELECT/WHERE/ORDER BY/LIMIT into optimized JXA traversals that push filtering down to the app's native query engine.

**Writes go through the SDK.** INSERT INTO, UPDATE, and DELETE operations route through the SDK so that inputs pass through Zod validation before any mutation occurs.

**Type shaping uses the SDK's schemas.** Raw JXA responses from reads are validated and transformed using the Zod schemas and type definitions from the SDK package. This ensures query results are clean, typed objects consistent with what every other surface returns.

Each resource becomes a virtual table. The hierarchy drives foreign keys:

```sql
CREATE TABLE calendars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  uid TEXT UNIQUE NOT NULL,
  writable BOOLEAN,
  description TEXT
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  calendar_id TEXT REFERENCES calendars(id),
  summary TEXT,
  start_date DATETIME,
  end_date DATETIME,
  ...
);
```

The SQL interface is the most speculative of the five surfaces. It may be worth building the other four first and evaluating whether the MCP server with good tool descriptions gives agents sufficient querying capability without a dedicated SQL layer.

## TypeScript SDK Generation

Each app gets a published npm package (`@macts/sdk-<app>`) that provides a fully typed, idiomatic TypeScript SDK. The developer experience should feel like using the Stripe or Notion SDK — no awareness of JXA, AppleScript, or `osascript` required.

### Developer Experience

The SDK presents the app's object model as a natural TypeScript class hierarchy with fluent collection accessors:

```tsx
import { Calendar } from '@macts/sdk-calendar'

const app = new Calendar()

// Collection accessors from hierarchy
const calendars = await app.calendars.list()
const work = await app.calendars.get('work-uid')

// Nested traversal
const events = await work.events.list({ after: new Date('2026-01-01') })
const standup = await work.events.create({
  summary: 'Team standup',
  startDate: new Date('2026-02-16T09:00:00'),
  endDate: new Date('2026-02-16T09:30:00'),
})

// Typed updates (only writable properties accepted)
await standup.update({ location: 'Room 4B' })

// Resource-scoped commands
await standup.show()

// Read-only nested collections
const attendees = await standup.attendees.list()

// App-level commands
await app.reloadCalendars()
await app.switchView({ to: 'week' })
```

### What the SDK Generator Needs from the Manifest

To generate this experience, the manifest must include several pieces of information beyond what the other surfaces require:

**1. Identifier fields.** Each resource must declare which property uniquely identifies an instance. For Calendar it’s `uid`. The SDK needs this to implement `.get(id)`, to construct JXA object specifiers internally, and to populate foreign keys in responses.

**2. Collection accessor names.** The `plural` field on each resource already serves this purpose — `calendars`, `events`, `attendees`. These become the property names on parent resource instances.

**3. Writable property subset.** The `create` and `update` methods must only accept writable properties. The manifest’s `access: rw` vs `access: r` annotations on each property drive this. The SDK generator produces separate TypeScript types: a full read type (all properties), a create input type (required writable properties), and an update input type (optional writable properties).

**4. Required vs optional on create.** When creating a resource, which writable properties are required? The JSON Schema’s `required` array defines this. The SDK generator uses it to produce a create input type where some fields are mandatory and others optional.

**5. JXA traversal mapping.** The SDK needs to translate fluent TypeScript calls into JXA object specifier chains internally. For example, `work.events.list()` must become something like `Application('Calendar').calendars.byId('work-uid').events()` in JXA. The hierarchy plus identifier field tells the generator how to construct these chains. This mapping is internal to the SDK and invisible to the user.

**6. Return type shaping.** JXA returns raw AppleScript objects. The SDK must transform these into clean TypeScript objects matching the resource schema. Dates must become `Date` objects, enums must become string literals, references must become IDs. The property type annotations in the manifest drive these transformations.

### Manifest Additions for SDK Generation

The `resources` section in `app.yaml` gains an `identifier` field:

```yaml
resources:
  calendar:
    name: Calendar
    plural: calendars
    identifier: uid # The property used for .get(id) lookups
    description: 'A calendar that contains events.'
    schema: schemas/resources/calendar.json
    properties:
      # ... (as before)

  event:
    name: Event
    plural: events
    identifier: uid
    # ...

  attendee:
    name: Attendee
    plural: attendees
    identifier: email # Some resources use different identifier fields
    # ...
```

### Generated Type Taxonomy

For each resource, the SDK generator produces multiple TypeScript types from the manifest:

- **`Calendar`** — The full read type. All properties, including read-only ones. This is what `.get()` and `.list()` return.
- **`CalendarCreateInput`** — Writable properties only. Required ones are non-optional, others are optional.
- **`CalendarUpdateInput`** — Writable properties only. All optional (partial update semantics).
- **`CalendarInstance`** — An active object with `.update()`, `.delete()`, child collection accessors (`.events`), and any resource-scoped commands (`.show()`).
- **`CalendarCollection`** — The collection accessor type with `.list()`, `.get(id)`, and `.create(input)` methods.

Zod schemas do triple duty throughout the system:

1. **TypeScript type inference** — The SDK's read, create, and update types are inferred directly from Zod schemas using `z.infer<>`, ensuring compile-time types and runtime validation are always in sync.
2. **Runtime validation on all surfaces** — Every surface (CLI argument parsing, HTTP request bodies, MCP tool inputs, SDK method arguments) validates through the same Zod schemas, producing consistent, informative error messages everywhere.
3. **Specification generation** — JSON Schema exports from Zod feed HTTP API specs (OpenAPI) and MCP tool definitions directly, with no manual schema authoring.

Example error message (consistent across all surfaces):

```jsx
CalendarCreateInput validation failed:
  • "name" is required
  • "color" expected string, received number
```

### Relationship to Other Surfaces

The SDK is the well-typed execution mechanism underneath all other integration surfaces. Each surface is **generated from the manifest** (to produce its surface-specific structure) and **leverages the SDK at runtime** (for actual execution).

- The **CLI** is generated from the manifest (subcommand tree, flag definitions, help text, enum tab completion) and calls the SDK to execute operations
- The **MCP server** is generated from the manifest (tool names, input schemas, descriptions) and calls the SDK to execute operations
- The **HTTP API** is generated from the manifest (route definitions, request/response schemas, OpenAPI spec) and calls the SDK to execute operations
- The **SQL interface** is a hybrid: reads bypass the SDK and go directly to JXA for efficient native querying (leveraging `whose` clauses), while writes go through the SDK for validation. Result shaping uses the SDK's Zod schemas and type definitions.

The manifest may contain information that a specific surface needs but that isn't relevant to the SDK itself. For example, CLI-specific metadata (flag aliases, positional argument ordering) or HTTP-specific metadata (custom status codes, pagination conventions) could live in the manifest without affecting the SDK's type definitions.

The key architectural point: there is exactly one place where JXA execution happens (the SDK), and all other surfaces delegate to it. But each surface may need supplemental information from the manifest beyond what the SDK expresses.

---

# Extraction Pipeline

**Implementation note:** AppleScript dictionaries use irregular singular/plural nomenclature extensively (e.g., "person" / "people", "index" / "indices"). The [`inflected`](https://www.npmjs.com/package/inflected) npm package should be used for reliable singularization and pluralization during extraction, rather than rolling custom heuristics.

The extraction pipeline transforms an `.sdef` XML dictionary into a manifest folder:

1. **Parse XML** — Extract suites, classes, properties, elements, commands, enumerations
2. **Resolve hierarchy** — Build containment tree from element definitions
3. **Classify properties** — Determine read/write access, resolve types, identify enums
4. **Classify commands** — Determine scope (application vs resource), identify target resources, resolve parameter types
5. **Generate Zod schemas** — Create Zod schemas for all resources, command inputs, command outputs, and enums
6. **Export JSON Schema** — Convert Zod schemas to JSON Schema files
7. **Compose app.yaml** — Write the manifest YAML referencing all schema files
8. **Copy source** — Include original `.sdef` for provenance

The pipeline uses `@jxa/run` for runtime execution and takes inspiration from `@jxa/sdef-to-dts` for XML parsing, but produces a fundamentally richer output.

---

# Open Questions — Resolved

**1. Inheritance.** Resolved: Use a recursive tree-based inheritance model in the manifest with `discriminator` and `variants` at each branching level. Each variant can optionally contain its own nested `inheritance` block. An `abstract: true` flag distinguishes union types (where the base type is not instantiatable) from concrete inheritance (where the base type can be instantiated directly). The flattened trait representation is derived from this tree for surfaces like CLI, SQL, and HTTP, while the SDK can use actual abstract classes and discriminated unions.

**2. Union types for alarms.** Resolved: Union types are modeled as inheritance with `abstract: true`. The base type cannot be instantiated; only concrete variants can. In the SDK, this maps to an abstract class with concrete subclasses. In the CLI, it maps to a required discriminator flag on create. In SQL, it maps to single-table inheritance with a non-nullable discriminator column.

**3. The `make` command.** Resolved: The generic `make` command is decomposed into per-resource creation contexts in the manifest's `creation` block. Each creation context maps to a static factory method in the SDK (`Project.create()`, `Project.createInProject(parentId, ...)`). The `make` command is a useful signal during extraction for identifying which resources are instantiatable, though other commands may also result in instantiation. Constructors are available as sugar on top of factory methods in the SDK, but factory methods are the canonical API because they map directly to named operations on every other surface.

**4. Property type precision.** Resolved: Do not rely on property-name heuristics to narrow types. The extraction pipeline must include a **runtime probing step** that actually invokes APIs to observe real return value shapes. The project establishes formalized standards (inspired by [Google AIPs](https://google.aip.dev/142)) for well-known types like dates, colors, durations, and other common patterns. These standards ensure consistent representation across all apps and all surfaces.

**5. Class extensions.** Resolved: Preserve extension groupings in the manifest rather than flattening everything together. Two approaches are viable: modeling extensions as traits (`has an X`) or as distinct interfaces. Both preserve provenance of which properties and commands came from which extension. The manifest records extension origins so generators can make surface-appropriate decisions.

**6. Value types vs resource types.** Resolved: The manifest includes an explicit `objectType` field with values `resource` or `value`. Resources are modeled as **classes** in the TypeScript SDK — they have identity, commands, collection accessors, and lifecycle. Value types are modeled as **interfaces** — they are plain data shapes with no commands. Value types never have commands and are not independently addressable in hierarchies.

```yaml
# Resource type
resources:
  event:
    objectType: resource
    name: Event
    # ... has identity, commands, hierarchy participation

# Value type
valueTypes:
  recurrence-details:
    objectType: value
    name: RecurrenceDetails
    # ... plain data shape, used as a property type
```

---

# Additional Manifest Artifacts

Beyond the core `app.yaml` and schema files, the manifest folder includes:

**App icon.** Extracted from the `.app` bundle. Used in API documentation, marketing pages, and web UIs showing supported applications.

**TCC entitlements.** Whether the app supports Automation Privacy (TCC) and what entitlements are needed. This is critical for users to understand what system permissions they'll need to grant.

**Distribution model.** App Store vs system app vs third-party distribution. If the dictionary differs significantly between distribution models, these should be treated as distinct SDK packages rather than merged. If differences are minor, treat as a single surface with notes.

**Application support paths.** Relative paths within `~/Library/Application Support/` and `/Library/Application Support/` that the app uses. These have strong consistency guarantees regardless of where the `.app` bundle lives on disk. Do NOT include the `.app` bundle path itself, as apps can live anywhere.

**AppleScript four-character codes.** Every suite, class, property, and command in the dictionary has a four-character code. These are preserved in the manifest and surfaced as TSDoc tags in the SDK. Four-character codes are critical for **detecting renames across dictionary versions** — if a function's name changes but its code is the same, that's a rename, not a removal plus addition.

```yaml
resources:
  event:
    name: Event
    code: 'evnt' # Four-character code from dictionary
    properties:
      summary:
        code: 'summ'
        # ...
```

In the SDK:

```tsx
/**
 * The event summary/title.
 * @applescriptCode summ
 */
get summary(): string
```

**Suite organization.** The dictionary groups elements into suites (e.g., "Standard Suite", "Calendar Suite"). Preserved in the manifest. May map to TypeScript namespaces in some apps but not others — this is a per-app decision, not a blanket rule.

```yaml
suites:
  - name: Standard Suite
    code: 'core'
    description: 'Common classes and commands for all applications.'
    resources: [application, document, window]
    commands: [open, close, save, make, delete]
  - name: Calendar Suite
    code: 'wres'
    description: 'Calendar-specific classes and commands.'
    resources: [calendar, event, attendee, display-alarm, mail-alarm, sound-alarm, open-file-alarm]
    commands: [show, reload-calendars, switch-view, view-calendar, get-url]
```

**Deprecation markers.** Commands and properties marked as obsolete in the dictionary are preserved with deprecation metadata. The manifest distinguishes between two deprecation sources:

```yaml
commands:
  create-calendar:
    name: createCalendar
    deprecation:
      source: upstream # Deprecated by the app vendor in the dictionary
      message: 'Obsolete, will be removed in next release.'
      since: '14.0' # App version where deprecation appeared
```

In the SDK, upstream deprecations use TSDoc `@deprecated` tags with clear attribution:

```tsx
/**
 * Creates a new calendar.
 * @deprecated Deprecated by Apple in Calendar 14.0: "Obsolete, will be removed in next release."
 */
static async createCalendar(input: CreateCalendarInput): Promise<CalendarInstance>
```

macts-internal deprecations (where the project deprecates its own abstraction) are distinguished separately:

```tsx
/**
 * @deprecated Deprecated by macts in v2.0: Use Calendar.create() instead.
 */
```

**Examples and defaults.** When the dictionary provides default values or example usage, these are included in the manifest and used in SDK generation for default parameter values.

```yaml
resources:
  event:
    properties:
      alldayEvent:
        access: rw
        type: boolean
        default: false
        description: 'True if this is an all-day event.'
```

In the SDK:

```tsx
static async createInCalendar(calendarId: string, input: {
  summary: string
  startDate: Date
  endDate: Date
  alldayEvent?: boolean  // defaults to false
}): Promise<EventInstance>
```

---

# SDK Package Versioning

SDK package versions are tied to the macOS version where the app or app version was introduced. For example:

- `@macts/sdk-freeform@13.1.0` — Freeform as it exists in macOS 13.1
- `@macts/sdk-calendar@14.0.0` — Calendar as it exists in macOS 14.0
- `@macts/sdk-omnifocus@15.0.0` — OmniFocus dictionary as extracted on macOS 15.0

This versioning scheme communicates compatibility clearly and aligns with the natural lifecycle of macOS app dictionaries changing across OS releases.

---

# Standardized Type Representations

The project establishes formalized standards for well-known types, ensuring consistent representation across all apps and all surfaces. Inspired by [Google API Improvement Proposals](https://google.aip.dev/142).

These standards are determined by **runtime probing** during extraction — actually invoking APIs to observe return value shapes — not by property-name heuristics.

Examples of standardized types (to be fully specified):

- **Dates and timestamps** — Consistent `Date` representation, timezone handling
- **Durations** — Standardized interval representation
- **Colors** — Consistent color format (hex, RGB, named)
- **File paths** — POSIX path strings with clear semantics
- **Enumerations** — String literal unions, not numeric codes

Each standard defines: the TypeScript type, the Zod schema, the JSON Schema representation, the CLI flag parsing behavior, the SQL column type, and the HTTP serialization format.

---

# Agentic Extraction Pipeline

The manifest extraction process must scale beyond apps that the core team owns. Many macOS apps are expensive, niche, or require specific licenses (e.g., Logic Pro, Final Cut Pro, OmniGraffle). Contributors who own these apps need a guided, consistent process for producing high-quality manifests.

## The Problem

Manifest extraction is not a simple mechanical transformation. It involves:

- Parsing the SDEF XML (mechanical, automatable)
- Resolving the resource hierarchy (partially automatable, requires judgment)
- Determining concrete types through runtime probing (requires the app to be installed and running)
- Designing the API surface (requires taste, consistency with established patterns, and knowledge of the app's domain)
- Identifying all instantiation patterns and creation contexts (requires understanding the app's workflows)
- Validating that the manifest is correct and complete (requires both automated checks and human review)

No single person will own every app. The extraction pipeline must be **contributor-friendly** and **agent-assisted**.

## Agentic Workflow

The extraction pipeline is implemented as an agentic workflow using [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) and the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview). The workflow takes an SDEF file as input and produces a manifest folder as output, with human review checkpoints.

### Workflow Steps

**Step 1: Mechanical Extraction.** Parse the SDEF XML and extract all suites, classes, properties, elements, commands, enumerations, four-character codes, deprecation markers, and inheritance relationships. This step is fully automated and deterministic.

**Step 2: Hierarchy Resolution.** The agent analyzes element containment relationships and proposes a resource hierarchy. It identifies potential ambiguities (resources that appear in multiple parents, circular references, resources that could be either value types or resource types) and flags them for review.

**Step 3: Type Probing.** If the contributor has the app installed, the agent generates JXA probe scripts that exercise the API and observe return value shapes. The agent runs these probes (with contributor approval), collects results, and uses them to narrow `any` types to concrete types aligned with the project's standardized type representations. If the app is not available, the agent uses dictionary metadata and heuristics, but marks type assignments with lower confidence.

**Step 4: API Surface Design.** The agent designs the SDK surface — resource classes, value type interfaces, factory methods, collection accessors, command methods — following all established API design patterns. When the agent encounters a pattern not covered by existing standards, it creates a **pattern proposal note** describing what it found and suggesting a new standard.

**Step 5: Creation Context Identification.** The agent analyzes `make` commands and other instantiation patterns to identify all creation contexts for each resource. It proposes factory methods and flags cases where it's uncertain whether a command results in instantiation.

**Step 6: Confidence Scoring.** The agent produces a confidence report covering:

```yaml
confidence:
  hierarchy:
    score: 0.92
    notes:
      - 'Clear parent-child relationships for all resources except Tag, which appears in both Project and Task contexts.'
      - "Recommend human review of Tag's placement in hierarchy."

  typeNarrowing:
    score: 0.78
    notes:
      - 'Runtime probing confirmed 14 of 18 property types.'
      - '4 properties returned inconsistent types across different contexts — defaulted to string.'
      - 'Color representation unclear: observed both hex strings and RGB arrays.'

  instantiationPatterns:
    score: 0.85
    notes:
      - 'Identified 6 creation contexts across 4 resources.'
      - "Uncertain whether 'duplicate' command should be modeled as a creation context or a command."

  valueTypeClassification:
    score: 0.95
    notes:
      - 'All value types confirmed — no commands found on any classified value type.'

  inheritanceModeling:
    score: 0.70
    notes:
      - 'Dictionary shows TextItem and RichTextItem with overlapping properties.'
      - 'Modeled as inheritance (RichTextItem extends TextItem) but could also be independent types.'
      - 'Recommend human review.'

  overallConfidence: 0.84
```

**Step 7: Open Questions Document.** The agent produces a structured list of open questions that need human answers before the manifest can be considered high-confidence:

```yaml
openQuestions:
  - id: OQ-001
    area: hierarchy
    question: 'Should Tag be a child of Project, Task, or both? The dictionary allows both containment relationships.'
    agentRecommendation: 'Model as child of both, since the app supports tags at both levels.'
    confidence: 0.75
    blocksGeneration: false

  - id: OQ-002
    area: typeNarrowing
    question: "The 'color' property returns hex strings in some contexts and RGB arrays in others. Which should be the canonical representation?"
    agentRecommendation: 'Standardize on hex strings and add a conversion utility.'
    confidence: 0.60
    blocksGeneration: true

  - id: OQ-003
    area: patterns
    question: "This app uses a 'duplicate' command that creates a new resource by copying an existing one. No established pattern exists for clone/duplicate semantics. Propose adding a 'duplicate' creation context type?"
    agentRecommendation: "Add 'duplicate' as a new creation context type alongside 'toplevel' and 'child'."
    confidence: 0.80
    blocksGeneration: false
    patternProposal: true
```

**Step 8: Manifest Assembly.** The agent assembles the full manifest folder, including all YAML, JSON Schema files, the app icon, the source SDEF, the confidence report, and the open questions document.

### Contributor Workflow

A contributor's experience looks like:

1. **Extract the SDEF** from their installed app (macts provides a helper command for this: `macts extract-dictionary "App Name"`)
2. **Run the extraction agent** (via Claude Code or a CLI command that invokes the Agent SDK workflow): `macts generate-manifest ./AppName.sdef`
3. **Review the agent's output** — the confidence report and open questions guide them to the areas that need human judgment
4. **Answer open questions** — either by editing the manifest directly or by responding to the agent's prompts
5. **Run validation** — automated checks verify schema consistency, hierarchy validity, and pattern compliance
6. **Open a pull request** — the PR includes the manifest folder, the confidence report, and any unresolved open questions for maintainer review

### PR Review Process

Maintainers reviewing a manifest PR can quickly assess quality by looking at:

- **Overall confidence score** — high confidence means less review needed
- **Open questions** — anything marked `blocksGeneration: true` must be resolved
- **Pattern proposals** — new patterns need broader discussion before adoption
- **Automated validation results** — schema consistency, naming conventions, hierarchy validity

### Agent Skills and Tools

The extraction agent needs access to:

- **SDEF parser** — XML parsing and structural extraction
- **JXA runtime** (via `@jxa/run`) — for type probing when the app is available
- **Pattern library** — the established API design patterns and standardized type representations
- **Existing manifests** — for consistency checking against already-published app manifests
- **Validation suite** — schema validators, naming convention checkers, hierarchy consistency checks

These are implemented as Claude Code skills or Agent SDK tools that the extraction agent can invoke during the workflow.
