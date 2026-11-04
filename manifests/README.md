# macOS Application Control TypeScript (macts) Manifest Format

This document describes the manifest format used by macts to represent the scriptable interface of macOS applications. Manifests are YAML files that describe an application's AppleScript/JXA dictionary, and drive code generation for both client SDKs and server packages.

## Overview

### What are Manifests?

Manifests are structured YAML files that capture the complete scriptable interface of a macOS application. They serve as the single source of truth for:

- **Resource types** - the objects that can be queried and manipulated (calendars, events, contacts, etc.)
- **Properties** - attributes of resources with their types and access modes
- **Commands** - operations that can be performed on resources or the application
- **Enumerations** - fixed sets of values for properties or parameters
- **Containment hierarchy** - parent-child relationships between resources
- **Permissions** - the authorization model for API access

### Relationship to AppleScript Dictionaries

macOS applications expose their scriptable interfaces through AppleScript dictionaries (sdef files). The manifest format is macts' structured representation of these dictionaries:

```
sdef (Apple's scripting dictionary)
  ↓ extraction
manifest (macts YAML representation)
  ↓ code generation
TypeScript SDK + Server packages
```

Manifests are more developer-friendly than raw sdef files because they:

- Use clear, consistent YAML structure
- Add explicit permission modeling
- Support deprecation tracking
- Include extraction metadata for validation
- Enable custom extensions beyond the sdef

### Code Generation

Manifests drive code generation through the `macts generate` command:

```bash
macts generate manifests/calendar/app.yaml --out-dir packages --target all
```

This produces:

1. **Client package** (`packages/calendar/`) - TypeScript SDK with HTTP client, CLI plugin, types, and schemas
2. **Server package** (`packages/calendar-server/`) - re-exports the app's contract (`@macts/calendar/contract`) as `contract`, for a macts host to serve

The generated code includes:

- Strongly-typed TypeScript interfaces for all resources
- Type-safe command functions with parameter validation
- Permission checking middleware
- OpenAPI/JSON Schema for HTTP APIs
- Documentation from manifest descriptions

## Manifest Schema Reference

A manifest consists of several top-level sections. The authoritative schema is defined in Zod schemas located in [`../packages/core/src/manifest/schemas/`](../packages/core/src/manifest/schemas/).

### Top-Level Structure

```yaml
version: '1.0'
app: { ... }
suites: [...]
resources: { ... }
enums: { ... }
hierarchy: { ... }
relationships: [...]
commands: { ... }
permissions: { ... }
extraction: { ... }
```

#### `version` (required)

The manifest format version. Currently must be `'1.0'`.

```yaml
version: '1.0'
```

#### `app` (required)

Application metadata. See [Application Metadata](#application-metadata).

#### `suites` (optional)

Suite organization from the AppleScript dictionary. See [Suites](#suites).

#### `resources` (required)

Resource type definitions. At least one resource is required. See [Resources](#resources).

#### `enums` (optional)

Enumeration type definitions. See [Enumerations](#enumerations).

#### `hierarchy` (required)

Containment hierarchy defining parent-child relationships. See [Hierarchy](#hierarchy).

#### `relationships` (optional)

Non-hierarchical relationships between resources. See [Relationships](#relationships).

#### `commands` (optional)

Command definitions for operations on resources or the application. See [Commands](#commands).

#### `permissions` (optional)

Permission mapping from coarse categories to fine-grained permissions. See [Permissions](#permissions-reference).

#### `extraction` (optional)

Metadata about the extraction process. See [Extraction Metadata](#extraction-metadata).

---

### Application Metadata

The `app` section contains metadata about the macOS application.

**Schema:** [`AppMetadataSchema`](../packages/core/src/manifest/schemas/metadata.ts)

```yaml
app:
  bundleId: com.apple.iCal
  name: Calendar
  displayName: Calendar
  version: '1.0'
  minMacOSVersion: '10.15'
  icon: /path/to/icon.png
  tccEntitlements:
    - calendar
    - automation
  distributionModel: system
```

#### Fields

| Field               | Type   | Required | Description                                                  |
| ------------------- | ------ | -------- | ------------------------------------------------------------ |
| `bundleId`          | string | Yes      | Bundle identifier (e.g., `com.apple.iCal`)                   |
| `name`              | string | Yes      | Internal application name (e.g., `Calendar`)                 |
| `displayName`       | string | No       | Display name shown to users                                  |
| `version`           | string | No       | Application version                                          |
| `minMacOSVersion`   | string | No       | Minimum macOS version required                               |
| `icon`              | string | No       | Path to application icon                                     |
| `tccEntitlements`   | array  | No       | Required TCC entitlements (see below)                        |
| `distributionModel` | enum   | No       | Distribution model: `app-store`, `developer-id`, or `system` |

#### TCC Entitlements

TCC (Transparency, Consent, and Control) entitlements indicate which privacy permissions the application requires:

- `calendar` - Access to Calendar data
- `contacts` - Access to Contacts data
- `reminders` - Access to Reminders data
- `photos` - Access to Photos library
- `music` - Access to Music library
- `files` - Full disk access or specific file access
- `accessibility` - Accessibility API access
- `automation` - AppleScript automation of other apps

**Example from Calendar.app:**

```yaml
app:
  bundleId: com.apple.iCal
  name: Calendar
  displayName: Calendar
  tccEntitlements:
    - calendar
    - automation
  distributionModel: system
```

---

### Suites

The `suites` section organizes the scripting dictionary into logical groups, mirroring the suite structure from the sdef file.

**Schema:** [`SuiteSchema`](../packages/core/src/manifest/schemas/metadata.ts)

```yaml
suites:
  - name: Standard Suite
    code: '????'
    description: Common classes and commands for all applications
  - name: iCal
    code: wrbt
    description: iCal classes and commands
    resources:
      - Calendar
      - Event
    commands:
      - reloadCalendars
      - switchView
    enums:
      - ParticipationStatus
      - EventStatus
```

#### Fields

| Field         | Type   | Required | Description                              |
| ------------- | ------ | -------- | ---------------------------------------- |
| `name`        | string | Yes      | Suite name                               |
| `description` | string | No       | Human-readable description               |
| `code`        | string | No       | AppleScript four-character code (legacy) |
| `resources`   | array  | No       | List of resource names in this suite     |
| `commands`    | array  | No       | List of command names in this suite      |
| `enums`       | array  | No       | List of enum names in this suite         |

Suites are primarily organizational and informational. They don't affect code generation directly but help document the structure of the original scripting dictionary.

---

### Resources

The `resources` section defines the resource types that can be queried and manipulated through the API.

**Schema:** [`ResourceSchema`](../packages/core/src/manifest/schemas/resource.ts)

Each resource is a named object in the resources map:

```yaml
resources:
  Calendar:
    name: Calendar
    plural: Calendars
    description: A calendar containing events
    code: wres
    properties: { ... }
    identifiers: [...]
  Event:
    name: Event
    plural: Events
    description: A calendar event
    code: wrev
    properties: { ... }
    identifiers: [...]
```

#### Resource Fields

| Field         | Type   | Required | Description                                                                                                                                                                                                                                                                     |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | string | Yes      | Resource name (singular, PascalCase)                                                                                                                                                                                                                                            |
| `plural`      | string | Yes      | Plural form for collections, PascalCase letters only (`MediaItems`, `URLs`); its lower camel case (`mediaItems`) spells the resource in routes, SDK accessors, tool names and permissions                                                                                       |
| `description` | string | Yes      | Human-readable description                                                                                                                                                                                                                                                      |
| `code`        | string | No       | AppleScript four-character code                                                                                                                                                                                                                                                 |
| `properties`  | object | No       | Property definitions (see [Properties](#properties))                                                                                                                                                                                                                            |
| `identifiers` | array  | No       | Identifier configuration (see [Identifiers](#identifiers))                                                                                                                                                                                                                      |
| `schema`      | string | No       | Reference to JSON Schema file for full data shape                                                                                                                                                                                                                               |
| `native`      | object | No       | The app's own spelling of the collection, where it differs from the plural's lower camel case, with dictionary evidence (see [Native spellings](#native-spellings))                                                                                                             |
| `unsupported` | object | No       | Marks a resource the app cannot provide (no collection in its dictionary, or every read fails), with evidence (see [Unsupported resources](#unsupported-resources))                                                                                                             |
| `rangeRead`   | object | No       | Whether the running app reads a range of the resource's collection, with live evidence; a list pages only when it is `supported: true`, and reads its pages as its `read` says (see [Range reads](#range-reads))                                                                |
| `roots`       | object | No       | Marks a singleton root: the app holds the resource's objects as its own properties, one per kind (`<kind>: { property, evidence }`, with dictionary evidence per kind). Validation derives the kind enum, a `kind` property and the identifier; see [Identifiers](#identifiers) |

#### Properties

Properties are defined as key-value pairs where the key is the property name and the value is a property definition.

**Schema:** [`PropertySchema`](../packages/core/src/manifest/schemas/property.ts)

```yaml
properties:
  name:
    access: rw
    type: string
    description: The calendar title
    code: pnam
  calendarIdentifier:
    access: r
    type: string
    description: A unique calendar key
    code: 'ID  '
  color:
    access: rw
    type: rgb
    description: The calendar color
    code: colr
  writable:
    access: r
    type: boolean
    description: Whether the calendar can be modified
```

##### Property Fields

| Field         | Type    | Required | Description                                                                                                                              |
| ------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `access`      | enum    | Yes      | Access mode: `r` (read-only) or `rw` (read-write)                                                                                        |
| `type`        | type    | No       | Property type (defaults to `string` if omitted)                                                                                          |
| `description` | string  | Yes      | Human-readable description                                                                                                               |
| `code`        | string  | No       | AppleScript four-character code                                                                                                          |
| `default`     | any     | No       | Default value                                                                                                                            |
| `optional`    | boolean | No       | Whether property is optional (defaults to `false`)                                                                                       |
| `deprecated`  | object  | No       | Deprecation information                                                                                                                  |
| `unsupported` | object  | No       | Marks a declared property the app cannot provide, with evidence (see [Unsupported properties](#unsupported-properties))                  |
| `native`      | object  | No       | The app's own name for the property, where it differs from the key, with dictionary evidence (see [Native spellings](#native-spellings)) |

##### Property Types

Property types can be primitives, arrays, resource references, or enum references.

**Primitive types:**

- `string` - Text
- `number` - Numeric value (floating-point)
- `integer` - Whole number
- `boolean` - True/false
- `date` - Date/time value
- `data` - Binary data
- `any` - Untyped value
- `file` - File reference
- `point` - Coordinate `{x, y}`
- `rect` - Rectangle `{x, y, width, height}`
- `rgb` - Color `{red, green, blue}`

**Array types:**

```yaml
excludedDates:
  access: rw
  type:
    array: date
  description: The exception dates for recurring events
```

**Resource references:**

```yaml
calendar:
  access: r
  type:
    resource: Calendar
  description: The calendar containing this event
```

**Enum references:**

```yaml
status:
  access: rw
  type:
    enum: EventStatus
  description: The event status
```

##### Deprecation

Properties can be marked as deprecated with optional version and replacement information:

```yaml
title:
  access: rw
  type: string
  description: The calendar title (synonym for name)
  deprecated:
    message: Use 'name' instead
    since: '10.0'
```

##### Unsupported properties

A manifest never drops a property the app's dictionary declares. When a
property cannot be used at runtime, it is marked `unsupported`, with the
evidence. The evidence takes one of two forms.

**Every read failed:** the app cannot provide the property (it is
unimplemented, obsolete, or otherwise unreadable).

```yaml
locked:
  access: r
  type: boolean
  description: Whether the note is locked
  unsupported:
    reason: The app does not implement this property.
    dictionaryNote: NOT AVAILABLE YET # optional: the dictionary's own note
    evidence:
      source: probe # a live, read-only observation
      observedAt: '2026-11-01T06:05:32.244Z'
      bundleId: com.example.jotter
      appVersion: '2.1'
      osVersion: '27.2'
      sampleSize: 40 # items whose read was attempted (at least 1)
      failedReads: 40 # must equal sampleSize: every read failed
      errorNumbers: # the distinct error numbers seen (at least 1)
        - -1728
```

**Every value had a kind the declared type cannot decode:** the reads succeed,
but the generated code cannot decode the values yet, so without the marker
every read of the resource would fail. The kinds are the probe's labels
(`date`, `number`, `boolean`, `string`, `record`, `list`, `reference`,
`other`), counted, never values.

```yaml
containerWindow:
  access: r
  type: string
  description: The container window for this folder
  unsupported:
    reason: Values are object references, which the generated code cannot decode yet.
    trackingIssue: 155 # optional: the issue whose fix will remove the marker
    evidence:
      source: probe
      observedAt: '2026-11-01T06:05:32.244Z'
      bundleId: com.apple.finder
      appVersion: '27.2'
      osVersion: '27.2'
      sampleSize: 18 # values whose kind was observed (at least 1)
      observedKinds: { reference: 18 } # counts by kind, summing to sampleSize
```

None of the observed kinds may be one the declared type expects: `string` is
read as strings, `integer` and `number` as numbers, `boolean` as booleans,
`date` as dates, `point` and `rgb` as lists or records, `rect` as records, a
list type as lists, and a resource or enum type as references or strings. Kind
evidence cannot mark a type that is not checked (`file`, `data`, `any`).

`trackingIssue`, on either form, names the issue whose fix will remove the
marker, such as the one that adds a conversion for the returned kind.

Every generated surface (the contract, the SDKs, the MCP tools, capabilities,
and the CLI) leaves a marked property out, for input and output alike, and the
nullability probe skips it (`skipped (unsupported)`). The manifest keeps it so
the record of what the dictionary declares stays complete and the omission
stays auditable.

The marker is curated: `macts probe --nullability` reports a property whose
every read failed, or whose every value had an unexpected kind, with the counts
to mark it, but never writes or changes a marker. A partial failure, or a mix
of matching and unexpected kinds, is not unsupported. A marked property carries
no `nullable` or `resettable` claim, and a resource's primary identifier cannot
be marked.

**Schema:** [`UnsupportedSchema`](../packages/core/src/manifest/schemas/evidence.ts)

##### Native spellings

Every public name (routes, SDK accessors, tool names, permissions, and the keys
of every record returned to a caller) is derived from the manifest: a
resource's from the lower camel case of its plural, a property's from its key.
The app addresses a collection or a property by its own spelling of the
dictionary term, its first word lowercased whole and each later word
capitalized. Where that spelling differs from the derived one, the manifest
records it under `native`, with the dictionary term as evidence:

```yaml
AirPlayDevice:
  name: AirPlayDevice
  plural: AirPlayDevices # public segment: airPlayDevices
  native:
    collection: airplayDevices # "AirPlay devices"
    evidence:
      source: dictionary
      bundleId: com.apple.Music
      appVersion: 1.7.2
      osVersion: '27.2'
      term: AirPlay devices # exactly as the dictionary writes it
```

```yaml
mACAddress: # public name
  access: r
  type: string
  description: the MAC address for the interface
  native:
    name: macAddress # "MAC address"
    evidence:
      source: dictionary
      bundleId: com.apple.systemevents
      appVersion: 1.3.6
      osVersion: '27.2'
      term: MAC address
```

Recording the derived spelling is rejected as redundant. A property marked
unsupported records no native name, and a resource marked unsupported no native
collection. The native executor addresses the app by the recorded spelling, and
returns records keyed by the public names.

**Schemas:** [`ResourceNativeSpellingSchema`](../packages/core/src/manifest/schemas/resource.ts), [`PropertyNativeSpellingSchema`](../packages/core/src/manifest/schemas/property.ts), [`DictionaryTermEvidenceSchema`](../packages/core/src/manifest/schemas/evidence.ts)

##### Unsupported resources

A manifest never drops a resource it declares. When the app's dictionary has
no collection for it, the resource is marked `unsupported`, with the dictionary
evidence:

```yaml
Connection:
  name: Connection
  plural: Connections
  description: A screen sharing connection
  unsupported:
    evidence:
      source: dictionary
      bundleId: com.apple.ScreenSharing
      appVersion: '7.1'
      osVersion: '27.2'
      term: connection # the term the manifest expected
      finding: no-class # or not-an-element
```

The finding says how the dictionary lacks the collection: `no-class`, it
declares no class with the resource's code or name; `not-an-element`, the class
exists but no class has it as an element, so the app reaches it some other way
(Finder's desktop is the application's `desktop` property).

When the dictionary declares the resource but the running app fails every read
of it, the marker carries live evidence instead, from a read-only observation:

```yaml
InstantMessage:
  name: InstantMessage
  plural: InstantMessages
  description: Address for instant messaging.
  unsupported:
    evidence:
      source: live
      observedAt: '2026-11-01T16:40:48.000Z' # ISO 8601 UTC
      bundleId: com.apple.AddressBook
      appVersion: '14.0'
      osVersion: '27.2'
      expression: every property of the instant messages of a person, and the item property record
      errorNumber: -1700 # the error the app raised
```

`expression` says in words what was addressed, never a value.

Every generated surface leaves a marked resource out: it has no routes, so no
operations, tools, capabilities or derived permissions, and the contract, the
SDKs and the CLI omit it with its hierarchy entries and every entry nested
under them. The manifest keeps it, so the omission stays auditable. A usable
property, command parameter or command result whose type names a marked
resource is rejected, since it would refer to nothing: change the type, or mark
the property or command unsupported too.

**Schemas:** [`ResourceUnsupportedSchema`](../packages/core/src/manifest/schemas/resource.ts), [`DictionaryAbsenceEvidenceSchema`](../packages/core/src/manifest/schemas/evidence.ts), [`LiveAbsenceEvidenceSchema`](../packages/core/src/manifest/schemas/evidence.ts)

##### Range reads

A list returns bounded pages only when the running app was observed to read a
range of the resource's collection, by position, in one request: an app that
rejects the read failed every page. The dictionary does not say whether ranges
work, so the marker comes from a live, read-only observation of the app, never
from the dictionary. A passing marker also records how a page is read, and the
measured cost it was chosen from, as its own observation:

```yaml
Reminder:
  name: Reminder
  plural: Reminders
  description: A reminder
  identifiers:
    - property: id
      primary: true
      unique: true
      evidence: { unique: { source: sdef, note: '...' } }
  rangeRead:
    supported: true
    read: range # how a page is read: range or column
    evidence:
      source: probe
      observedAt: '2026-11-03T17:59:10.000Z' # when range reads were checked, ISO 8601 UTC
      bundleId: com.apple.reminders
      appVersion: '7.0'
      osVersion: '27.2'
      cost:
        observedAt: '2026-11-03T21:20:00.000Z' # when the page was timed
        pageMs: 7082 # the page read by range, in milliseconds
        columnMs: 46179 # the same page read by column
        items: 332 # the collection size the page was read from
        runs: 3 # each time is the median of this many reads
        pageSize: 25 # the size of the timed page
      note: Pages of 25 and of 2, continued by cursor # what was read, never a value
```

`read` says how the list reads a page's items:

- `range`: each property is read once over the page's items, as a range of the
  collection. A page costs what it holds.
- `column`: each property is read once over the whole collection, and the
  values are cut to the page. Some apps answer a range read item by item but a
  whole-collection read at once (Contacts people), so a column page is far
  faster there.

Both give the same page, cursor, anchor check and `COLLECTION_CHANGED`. `read`
and `evidence.cost` are required with `supported: true`. `cost` is its own
observation, dated by its own `observedAt`, since the page is timed apart from
the check that range reads work. It records:

- `pageMs`: the first page of `pageSize` items read by range, in milliseconds;
- `columnMs`: the same page read by column;
- `items`: how many items the collection held;
- `runs`: how many times the page was read each way, the two reads
  interleaved; `pageMs` and `columnMs` are the medians of these runs;
- `pageSize`: the size of the timed page, the default page size of 25.

All six are required, the times are whole milliseconds, and `items`, `runs` and
`pageSize` are at least 1.
`range` is the default, because a range page costs what the page holds and so
keeps paging's latency bound. `read` is `column` only when the column page took
at most three quarters of the range page's time (`columnMs <= 0.75 × pageMs`),
and `range` otherwise, ties included; the schema rejects any other `read`. The
margin absorbs typical measurement noise, so a small difference keeps `range`.
A result near the margin can fall either side when measured again; the
recorded medians decide. A column page costs what the whole collection costs, so it gets
slower as the collection grows: the choice holds at the recorded `items`, and
should be measured again when the collection grows well past it.

The cost is measured with a read-only harness that times every list that pages
both ways through the real list body and prints the `cost` block and `read` to
record. It never writes to an app and prints only timings and counts:

```sh
pnpm --filter @macts/core build
MACTS_LIVE_APPS=1 MACTS_PAGE_COST=1 pnpm --filter @macts/core exec vitest run src/jxa/page-read-cost.live.test.ts
```

`MACTS_PAGE_COST_RUNS` sets the runs (5 by default), and
`MACTS_PAGE_COST_LISTS` limits it to some lists, e.g. `reminders.lists.list`.
See [`page-read-cost.live.test.ts`](../packages/core/src/jxa/page-read-cost.live.test.ts).

A range read observed to fail is recorded as `supported: false`, with the
distinct error numbers it raised:

```yaml
rangeRead:
  supported: false
  evidence:
    source: probe
    observedAt: '2026-11-03T17:58:53.000Z'
    bundleId: com.apple.Music
    appVersion: '1.7.2'
    osVersion: '27.2'
    errorNumbers: [-1708] # the request was not understood
```

A failed observation records no `read` and no `cost`.

A list pages exactly when its resource's primary identifier is claimed unique
and its resource carries `rangeRead.supported: true`. With no marker, or
`supported: false`, the list takes no `pageSize` or `cursor` input and returns
its whole collection as one page. A resource marked `unsupported` records no
range read.

**Schemas:** [`ResourceRangeReadSchema`](../packages/core/src/manifest/schemas/resource.ts), [`RangeReadEvidenceSchema`](../packages/core/src/manifest/schemas/evidence.ts)

#### Identifiers

Identifiers define which properties uniquely identify a resource instance.

**Schema:** [`IdentifierSchema`](../packages/core/src/manifest/schemas/resource.ts)

```yaml
identifiers:
  - property: calendarIdentifier
    primary: true
  - property: name
    primary: false
```

| Field       | Type    | Required | Description                                                                                                                                                                                                                                                                    |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `property`  | string  | Yes      | Name of the property used as identifier                                                                                                                                                                                                                                        |
| `primary`   | boolean | No       | Whether this is the primary identifier (defaults to `false`)                                                                                                                                                                                                                   |
| `targeting` | enum    | No       | How the app finds an item from the identifier: `byId` (default, the app's id form), `byProperty` (a match on a working property), `byKey` (the collection's key form, which the app interprets, such as a path), or `byRoot` (a singleton root's kind; derived, never written) |

The primary identifier is used for lookups and references. A resource should have exactly one primary identifier.

---

### Enumerations

The `enums` section defines fixed sets of values for properties or parameters.

**Schema:** [`EnumSchema`](../packages/core/src/manifest/schemas/enum.ts)

```yaml
enums:
  ParticipationStatus:
    name: ParticipationStatus
    description: Status of an attendee's response to an invitation
    code: wre6
    values:
      - name: unknown
        value: unknown
        description: No answer yet
        code: E6na
      - name: accepted
        value: accepted
        description: Invitation has been accepted
        code: E6ap
      - name: declined
        value: declined
        description: Invitation has been declined
        code: E6dp
      - name: tentative
        value: tentative
        description: Invitation has been tentatively accepted
        code: E6tp
```

#### Enum Fields

| Field         | Type   | Required | Description                         |
| ------------- | ------ | -------- | ----------------------------------- |
| `name`        | string | Yes      | Enum name (PascalCase)              |
| `description` | string | No       | Human-readable description          |
| `code`        | string | No       | AppleScript four-character code     |
| `values`      | array  | Yes      | Enum values (at least one required) |

#### Enum Value Fields

**Schema:** [`EnumValueSchema`](../packages/core/src/manifest/schemas/enum.ts)

| Field         | Type             | Required | Description                     |
| ------------- | ---------------- | -------- | ------------------------------- |
| `name`        | string           | Yes      | Value name (camelCase)          |
| `value`       | string or number | Yes      | Actual value                    |
| `description` | string           | No       | Human-readable description      |
| `code`        | string           | No       | AppleScript four-character code |

---

### Hierarchy

The `hierarchy` section defines the containment structure - which resources can contain which other resources.

**Schema:** [`HierarchySchema`](../packages/core/src/manifest/schemas/hierarchy.ts)

```yaml
hierarchy:
  children:
    calendars:
      resource: Calendar
      access: rw
      description: Calendars in the application
      children:
        events:
          resource: Event
          access: rw
          description: Events within a calendar
          children:
            attendees:
              resource: Attendee
              access: r
              description: Attendees of an event
            displayAlarms:
              resource: DisplayAlarm
              access: rw
              description: Display alarms for an event
```

This represents the tree:

```
Application
├─ calendars (Calendar)
   ├─ events (Event)
      ├─ attendees (Attendee)
      ├─ displayAlarms (DisplayAlarm)
      ├─ mailAlarms (MailAlarm)
      └─ soundAlarms (SoundAlarm)
```

#### Hierarchy Child Fields

**Schema:** [`HierarchyChildSchema`](../packages/core/src/manifest/schemas/hierarchy.ts)

| Field         | Type   | Required | Description                                              |
| ------------- | ------ | -------- | -------------------------------------------------------- |
| `resource`    | string | Yes      | Key of a declared resource (validated, at any depth)     |
| `access`      | enum   | Yes      | Access mode: `r` (read-only) or `rw` (can create/delete) |
| `description` | string | No       | Human-readable description of this relationship          |
| `children`    | object | No       | Nested children (recursive)                              |

The `access` mode determines what operations are permitted:

- `r` - Can read/list child resources only
- `rw` - Can read, create, update, and delete child resources

A resource that is also an element of the application is a top-level child as
well as a nested one, keyed by the lower camel case of its plural, with the
access of its nested entry. Reminders lists `reminders` both at the top level
and under `lists`, and Automator lists `automatorActions` and `variables` both
at the top level and under `workflows`.

---

### Relationships

The `relationships` section defines non-hierarchical associations between resources.

**Schema:** [`RelationshipSchema`](../packages/core/src/manifest/schemas/relationship.ts)

```yaml
relationships:
  - name: eventCalendar
    from: Event
    to: Calendar
    cardinality: many-to-one
    property: calendar
    description: Each event belongs to one calendar
```

#### Relationship Fields

| Field         | Type   | Required | Description                                 |
| ------------- | ------ | -------- | ------------------------------------------- |
| `name`        | string | Yes      | Relationship name                           |
| `from`        | string | Yes      | Source resource type                        |
| `to`          | string | Yes      | Target resource type                        |
| `cardinality` | enum   | Yes      | Relationship cardinality (see below)        |
| `property`    | string | No       | Property on source that holds the reference |
| `description` | string | No       | Human-readable description                  |

#### Cardinality Values

- `one-to-one` - Each source relates to exactly one target
- `one-to-many` - Each source relates to multiple targets
- `many-to-one` - Multiple sources relate to one target
- `many-to-many` - Multiple sources relate to multiple targets

Relationships are informational and help document the data model. Unlike hierarchy, they don't define containment or access paths.

---

### Commands

The `commands` section defines operations that can be performed on resources or the application.

**Schema:** [`CommandSchema`](../packages/core/src/manifest/schemas/command.ts)

```yaml
commands:
  list:
    name: list
    description: List all calendars
    scope: resource
    resourceType: Calendar
    code: core
    parameters: []
    permission: calendar:calendars:list

  createEvent:
    name: create
    description: Create a new event
    scope: resource
    resourceType: Event
    parent:
      resource: Calendar
      parameter: calendarId
    code: crel
    parameters:
      - name: calendarId
        type: string
        description: Calendar identifier for the event
        required: true
      - name: summary
        type: string
        description: Event title
        required: true
      - name: startDate
        type: date
        description: Event start date
        required: true
    returns: Event
    permission: calendar:events:create

  switchView:
    name: switchView
    description: Show calendar on the given view
    scope: application
    code: aeca
    parameters:
      - name: to
        type: ViewType
        description: The calendar view to be displayed
        required: true
        code: wre5
    permission: calendar:app:switchView
```

#### Command Fields

| Field               | Type            | Required | Description                                                          |
| ------------------- | --------------- | -------- | -------------------------------------------------------------------- |
| `name`              | string          | Yes      | Command name (camelCase)                                             |
| `description`       | string          | Yes      | Human-readable description                                           |
| `scope`             | enum            | Yes      | Command scope: `application` or `resource`                           |
| `resourceType`      | string or array | No       | For resource-scoped commands, which resource type(s) can be targeted |
| `parameters`        | array           | No       | Input parameters                                                     |
| `parent`            | object          | No       | The parent the target is reached through (see below)                 |
| `returns`           | string          | No       | Return type (void if omitted)                                        |
| `code`              | string          | No       | AppleScript four-character code                                      |
| `permission`        | string          | No       | Fine-grained permission required (format: `app:resource:operation`)  |
| `permissionHistory` | array           | No       | History of permission changes for upgrade messages                   |
| `unsupported`       | object          | No       | Marks a command the running app cannot carry out, with live evidence |

#### Command parents

A command on a nested resource records the parent its target is reached
through: `resource` is the key of the resource whose items hold the command's
resource as elements, and `parameter` is the command's own required parameter
that carries the parent item's identifier.

```yaml
listBookmarkItems:
  name: list
  scope: resource
  resourceType: BookmarkItem
  parent:
    resource: BookmarkFolder
    parameter: folderId
  parameters:
    - name: folderId
      type: string
      description: Bookmark folder identifier
      required: true
```

The parent is recorded from the app's dictionary (the parent's class has the
command's resource as an element). It is never derived from a parameter's
name or position, or from the hierarchy. The command reaches its target
through the parent resource's collection, the parent item in it (by that
resource's identifiers), and the command's resource collection under that
item. A command with no `parent` addresses its resource at the application.

The schema rejects a `parent.resource` the manifest does not declare, one
marked unsupported on a usable command, and a `parent.parameter` that is not a
required parameter of the command.

Every list, get, create, update or delete command on a resource that the
hierarchy nests under another resource, and that is not also a top-level
child, must record a parent; a test over every shipped manifest enforces it.
The only exceptions are the nested commands whose parent awaits a design
decision, tracked in [#173](https://github.com/mike-north/macts/issues/173).

**Schema:** [`CommandParentSchema`](../packages/core/src/manifest/schemas/command.ts)

#### Unsupported commands

A manifest never drops a command it declares. When a live, read-only
observation shows the running app cannot carry it out, the command is marked
`unsupported`, with live evidence in the form shown in
[Unsupported resources](#unsupported-resources):

```yaml
getSetting:
  name: get
  routeName: get
  scope: resource
  resourceType: Setting
  unsupported:
    evidence:
      source: live
      observedAt: '2026-11-01T16:34:20.000Z'
      bundleId: com.apple.Automator
      appVersion: '2.10'
      osVersion: '27.2'
      expression: the settings collection at the application
      errorNumber: -1728
```

A marked command has no route, so no operation, tool, capability or derived
permission, and the SDKs and the CLI omit it. The manifest keeps it, so the
omission stays auditable.

**Schemas:** [`CommandUnsupportedSchema`](../packages/core/src/manifest/schemas/command.ts), [`LiveAbsenceEvidenceSchema`](../packages/core/src/manifest/schemas/evidence.ts)

#### Command Scope

- `application` - Operates on the application itself (e.g., `switchView`, `reloadCalendars`)
- `resource` - Operates on a specific resource instance (e.g., `getEvent`, `createCalendar`)

Resource-scoped commands must specify `resourceType` to indicate which resource(s) they target.

#### Command Parameters

**Schema:** [`CommandParameterSchema`](../packages/core/src/manifest/schemas/command.ts)

```yaml
parameters:
  - name: calendarId
    type: string
    description: Calendar identifier
    required: true
  - name: color
    type: rgb
    description: Calendar color
    required: false
    default: { red: 0, green: 0, blue: 255 }
  - name: view
    type: ViewType
    description: View type
    required: true
    code: wre5
```

| Field         | Type             | Required | Description                                           |
| ------------- | ---------------- | -------- | ----------------------------------------------------- |
| `name`        | string           | Yes      | Parameter name                                        |
| `type`        | string or object | Yes      | Parameter type (primitive string or reference object) |
| `description` | string           | Yes      | Human-readable description                            |
| `required`    | boolean          | No       | Whether parameter is required (defaults to `true`)    |
| `default`     | any              | No       | Default value if not required                         |
| `code`        | string           | No       | AppleScript four-character code                       |

Parameter types follow the same rules as [property types](#property-types), supporting primitives, arrays, resource references, and enum references.

#### Permission History

Commands can track permission changes over time to provide helpful error messages when API keys become outdated:

**Schema:** [`PermissionHistoryEntrySchema`](../packages/core/src/manifest/schemas/command.ts)

```yaml
permission: calendar:events:list
permissionHistory:
  - version: '2.0.0'
    permission: calendar:events:read
    changed: '2024-01-15T00:00:00Z'
    reason: Split read permission into list and get for finer-grained access control
```

| Field        | Type   | Required | Description                          |
| ------------ | ------ | -------- | ------------------------------------ |
| `version`    | string | Yes      | Version when the permission changed  |
| `permission` | string | Yes      | Previous permission string           |
| `changed`    | string | Yes      | ISO date when the change occurred    |
| `reason`     | string | No       | Human-readable reason for the change |

When a permission check fails, the system can detect if the user has the old permission and suggest regenerating their API key.

---

### Permissions Reference

The `permissions` section maps coarse CRUD-style permissions to fine-grained per-command permissions. This enables flexible authorization where users can request either specific fine-grained permissions or broader coarse categories.

**Schema:** [`PermissionsSectionSchema`](../packages/core/src/manifest/schemas/app.ts)

```yaml
permissions:
  calendars:
    read:
      - calendar:calendars:list
      - calendar:calendars:get
      - calendar:calendars:reload
    create:
      - calendar:calendars:create

  events:
    read:
      - calendar:events:list
      - calendar:events:get
      - calendar:events:show
    create:
      - calendar:events:create
    write:
      - calendar:events:update
    delete:
      - calendar:events:delete

  app:
    read:
      - calendar:app:switchView
      - calendar:app:viewCalendar
```

#### Structure

The permissions section is a two-level mapping:

1. **Resource level** - Maps resource names (or `app` for application-level) to operation mappings
2. **Operation level** - Maps coarse operation names to arrays of fine-grained permissions

Each fine-grained permission follows the format: `<app>:<resource>:<operation>`

Every fine-grained permission a group lists must be one that some route of the app requires. An operation the app has no command for is left out of the groups, rather than listed ahead of its command; adding the command adds its group entry in the same change. A test over every shipped manifest, `packages/core/src/manifest/permission-group-routes.test.ts`, checks this. Key creation still grants a well-formed fine-grained permission no group lists, as written, with a warning naming the closest permission a route requires.

#### Coarse Operations

Standard coarse operations follow CRUD conventions:

- `read` - List, get, show operations
- `create` - Create operations
- `write` - Update/modify operations
- `delete` - Delete/remove operations

Applications can define additional coarse operations beyond these standard ones (e.g., `purge`, `admin`, `export`).

---

### Extraction Metadata

The `extraction` section contains metadata about how the manifest was created, including confidence scores and open questions for human review.

**Schema:** [`ExtractionMetadataSchema`](../packages/core/src/manifest/schemas/metadata.ts)

```yaml
extraction:
  extractedAt: '2024-01-15T10:30:00Z'
  mactsVersion: '1.0.0'
  sourceFile: Calendar.sdef
  confidence:
    overall: 0.95
    fields:
      resources: 1.0
      enums: 1.0
      hierarchy: 0.95
      commands: 0.95
  openQuestions:
    - question: Should CalendarPriority enum be exposed or is it unused in modern Calendar.app?
      context: The enum is defined in the SDEF but no properties reference it
      relatedTo: CalendarPriority
    - question: Are there additional Standard Suite commands that should be explicitly documented?
      context: Standard Suite is included via xi:include reference
      suggestions:
        - Include standard commands explicitly
        - Reference Standard Suite documentation separately
```

#### Fields

| Field           | Type   | Required | Description                            |
| --------------- | ------ | -------- | -------------------------------------- |
| `extractedAt`   | string | No       | ISO 8601 timestamp of extraction       |
| `mactsVersion`  | string | No       | Version of macts used for extraction   |
| `sourceFile`    | string | No       | Source dictionary filename             |
| `confidence`    | object | No       | Confidence scores (see below)          |
| `openQuestions` | array  | No       | Questions for human review (see below) |

#### Confidence Scores

Confidence scores range from 0.0 (no confidence) to 1.0 (fully confident).

```yaml
confidence:
  overall: 0.95
  fields:
    resources: 1.0
    enums: 1.0
    hierarchy: 0.95
```

| Field     | Description                   |
| --------- | ----------------------------- |
| `overall` | Overall extraction confidence |
| `fields`  | Per-section confidence scores |

#### Open Questions

Open questions flag ambiguities that require human review:

**Schema:** [`OpenQuestionSchema`](../packages/core/src/manifest/schemas/metadata.ts)

```yaml
openQuestions:
  - question: Should this enum be exposed?
    context: The enum is defined but no properties reference it
    suggestions:
      - Expose as optional enum
      - Omit from manifest
    relatedTo: CalendarPriority
```

| Field         | Type   | Required | Description                             |
| ------------- | ------ | -------- | --------------------------------------- |
| `question`    | string | Yes      | The question being asked                |
| `context`     | string | No       | Context about where this question arose |
| `suggestions` | array  | No       | Suggested answers to choose from        |
| `relatedTo`   | string | No       | Related resource/command/property name  |

---

## Permissions Model

The permissions system has three tiers that work together to provide flexible, secure authorization.

### Three-Tier Permission System

#### 1. Fine-Grained Permissions

Fine-grained permissions are the most specific level - **one permission per command**.

**Format:** `<app>:<resource>:<operation>`

**Examples:**

```
calendar:events:list
calendar:events:get
calendar:events:show
calendar:events:create
calendar:calendars:reload
calendar:app:switchView
```

Each command in the manifest has a `permission` field specifying its fine-grained permission:

```yaml
commands:
  listEvents:
    name: list
    description: List all events in a calendar
    scope: resource
    resourceType: Event
    permission: calendar:events:list
```

#### 2. Coarse Permissions

Coarse permissions are **CRUD-style groups** that expand to multiple fine-grained permissions.

**Format:** `<app>:<resource>:<crud-operation>`

**Examples:**

```
calendar:events:read       → calendar:events:list, calendar:events:get, calendar:events:show
calendar:events:create     → calendar:events:create
calendar:events:write      → calendar:events:update
```

The expansion is defined in the manifest's `permissions` section:

```yaml
permissions:
  events:
    read:
      - calendar:events:list
      - calendar:events:get
      - calendar:events:show
    create:
      - calendar:events:create
    write:
      - calendar:events:update
    delete:
      - calendar:events:delete
```

#### 3. Wildcard Permissions

Wildcard permissions use `*` to match multiple resources or operations.

**Format:** `<app>:<resource|*>:<operation|*>`

**Examples:**

```
calendar:*:read            → All read operations on all calendar resources
calendar:events:*          → All operations on events
calendar:*:*               → Full access to all calendar functionality
```

Wildcards are expanded at key creation time by iterating through the permissions mapping.

### How Permissions Work Together

#### At Manifest Definition Time

1. Each command declares its fine-grained permission requirement
2. The `permissions` section maps coarse categories to fine-grained permissions
3. The mapping is validated to ensure all command permissions are included

#### At API Key Creation Time

Users request permissions using any combination of fine, coarse, or wildcard:

```bash
macts keys create \
  --permissions calendar:events:read \
  --permissions calendar:calendars:create \
  --permissions calendar:app:*
```

The system expands the requested permissions to fine-grained:

```
calendar:events:read         → calendar:events:list, calendar:events:get, calendar:events:show
calendar:calendars:create    → calendar:calendars:create
calendar:app:*               → calendar:app:switchView, calendar:app:viewCalendar
```

The expanded fine-grained permissions are stored in the API key payload.

#### At Request Time

When a command is invoked:

1. The command's required fine-grained permission is extracted from the manifest
2. The API key's permissions are checked for a match
3. Matching supports both exact matches and wildcards in the key's permissions
4. If denied, the system checks `permissionHistory` to provide helpful upgrade hints

### Permission Matching Logic

The permission matcher ([`../packages/core/src/permissions/matcher.ts`](../packages/core/src/permissions/matcher.ts)) implements this algorithm:

```typescript
function hasPermission(
  grantedPermissions: string[], // Fine-grained permissions from API key
  requiredPermission: string // Fine-grained permission from command
): PermissionCheckResult
```

**Matching rules:**

1. **Direct match** - Simplest case, required permission is in granted list
2. **Wildcard match** - Granted permission contains `*` and matches the pattern:
   - App must always match exactly
   - Resource matches if exact or `*`
   - Operation matches if exact or `*`

**Examples:**

| Granted                | Required               | Match?                        |
| ---------------------- | ---------------------- | ----------------------------- |
| `calendar:events:list` | `calendar:events:list` | Yes (direct)                  |
| `calendar:*:read`      | `calendar:events:list` | No (read is coarse, not fine) |
| `calendar:events:*`    | `calendar:events:list` | Yes (wildcard)                |
| `calendar:*:list`      | `calendar:events:list` | Yes (wildcard)                |
| `calendar:*:*`         | `calendar:events:list` | Yes (wildcard)                |
| `calendar:events:get`  | `calendar:events:list` | No (different operations)     |

### Permission Lifecycle

```
User requests permissions (fine/coarse/wildcard)
  ↓
Expander expands to fine-grained using manifest mapping
  ↓
Fine-grained permissions stored in API key
  ↓
At request time, matcher checks key permissions vs command permission
  ↓
Access granted or denied with helpful error message
```

### Permission Change Management

When a command's permission changes between versions, the `permissionHistory` field tracks the change:

```yaml
permission: calendar:events:list
permissionHistory:
  - version: '2.0.0'
    permission: calendar:events:read
    changed: '2024-01-15T00:00:00Z'
    reason: Split read permission into list and get
```

If a key has the old permission (`calendar:events:read`) but the command now requires `calendar:events:list`, the matcher detects this and returns:

```json
{
  "granted": false,
  "required": "calendar:events:list",
  "hint": "Permission changed in v2.0.0 (was: calendar:events:read). Regenerate your API key.",
  "changelog": {
    "version": "2.0.0",
    "previousPermission": "calendar:events:read",
    "reason": "Split read permission into list and get"
  }
}
```

This provides a smooth upgrade path when permission requirements evolve.

## JSON Schema

A JSON Schema representation of the manifest format is available at [`app-manifest.schema.json`](./app-manifest.schema.json).

**Note:** The current JSON Schema generation from Zod schemas is incomplete. For the authoritative schema definition, refer to the Zod schemas in [`../packages/core/src/manifest/schemas/`](../packages/core/src/manifest/schemas/).

To regenerate the JSON Schema:

```bash
node --input-type=module -e "
import { AppManifestSchema, toJsonSchemaWithDefinitions } from './packages/core/dist/index.js';
const schema = toJsonSchemaWithDefinitions(AppManifestSchema, 'AppManifest');
console.log(JSON.stringify(schema, null, 2));
" > manifests/app-manifest.schema.json
```

## Complete Example

See [`calendar/app.yaml`](./calendar/app.yaml) for a complete, production-ready manifest. It demonstrates all major features including:

- Application metadata with TCC entitlements
- Multiple resource types with properties, identifiers, and deprecations
- Enumerations with descriptions
- Nested containment hierarchy
- Resource-scoped and application-scoped commands
- Comprehensive permissions mapping
- Extraction metadata with confidence scores and open questions

The Calendar manifest is used throughout this documentation as the reference example.

## Creating a New Manifest

To create a manifest for a new macOS application:

1. **Start with app metadata** - Bundle ID, name, and TCC entitlements
2. **Extract from sdef if available** - Use `macts extract` to generate an initial manifest
3. **Define resources** - Model the key object types with their properties
4. **Define hierarchy** - Map out containment relationships
5. **Define commands** - List the operations users can perform
6. **Map permissions** - Group fine-grained permissions into coarse categories
7. **Add confidence and questions** - Flag uncertain areas for review
8. **Validate** - Use `macts validate` to check for errors
9. **Generate code** - Run `macts generate` to produce SDK and server packages
10. **Test** - Verify generated code works with the actual application

Refer to the [Zod schemas](../packages/core/src/manifest/schemas/) for complete field validation rules and requirements.
