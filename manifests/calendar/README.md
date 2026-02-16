# Calendar.app Manifest

Complete manifest for macOS Calendar.app (formerly iCal) extracted from its AppleScript dictionary.

## Overview

This manifest provides a structured, type-safe representation of Calendar.app's scriptable interface, including:

- **7 Resources**: Calendar, Event, Attendee, and 4 alarm types (Display, Mail, Sound, OpenFile)
- **4 Enums**: ParticipationStatus, EventStatus, CalendarPriority, ViewType
- **4 Commands**: reloadCalendars, switchView, viewCalendar, show
- **Hierarchical Structure**: Application → Calendars → Events → (Attendees + Alarms)

## Files

- `app.yaml` - The complete manifest in YAML format
- `source.sdef` - Original SDEF (Scripting Definition) extracted from Calendar.app for provenance
- `app.test.ts` - Comprehensive test suite validating the manifest structure
- `package.json` - Package configuration for running tests

## Resources

### Calendar

A calendar containing events.

**Key Properties:**
- `name` (rw, string) - Calendar title
- `calendarIdentifier` (r, string) - Unique identifier (primary key)
- `color` (rw, rgb) - Calendar color
- `writable` (r, boolean) - Whether the calendar can be modified
- `description` (rw, string) - Calendar description

### Event

A calendar event with full scheduling details.

**Key Properties:**
- `uid` (r, string) - Unique identifier (primary key)
- `summary` (rw, string) - Event title
- `startDate` / `endDate` (rw, date) - Event timing
- `location` (rw, string) - Event location
- `alldayEvent` (rw, boolean) - Whether it's an all-day event
- `recurrence` (rw, string) - RFC 2445 recurrence string
- `status` (rw, EventStatus enum) - Event status
- `excludedDates` (rw, date[]) - Exception dates for recurring events
- `url` (rw, string) - Associated URL

### Attendee

An event attendee (read-only).

**Key Properties:**
- `displayName` (r, string) - Full name
- `email` (r, string) - Email address
- `participationStatus` (r, ParticipationStatus enum) - Response status

### Alarm Types

Four types of alarms, all with trigger timing:

1. **DisplayAlarm** - Shows a message
2. **MailAlarm** - Sends an email
3. **SoundAlarm** - Plays a sound (with `soundName` or `soundFile` properties)
4. **OpenFileAlarm** - Opens a file (deprecated since macOS 10.14)

All alarms support:
- `triggerInterval` (rw, integer) - Minutes before/after event (negative = before, positive = after)
- `triggerDate` (rw, date) - Absolute alarm time

## Enums

### ParticipationStatus

Attendee response status:
- `unknown` - No answer yet
- `accepted` - Invitation accepted
- `declined` - Invitation declined
- `tentative` - Tentatively accepted

### EventStatus

Event confirmation status:
- `none` - No status set
- `tentative` - Tentative event
- `confirmed` - Confirmed event
- `cancelled` - Cancelled event

### ViewType

Calendar view modes:
- `dayView` - Day view
- `weekView` - Week view
- `monthView` - Month view

### CalendarPriority

Priority levels (values are numeric):
- `noPriority` (0)
- `highPriority` (1)
- `mediumPriority` (5)
- `lowPriority` (9)

Note: This enum is defined in the SDEF but not currently used by any properties.

## Commands

### reloadCalendars

**Scope:** Application
**Description:** Tell the application to reload all calendar files contents
**Parameters:** None

### switchView

**Scope:** Application
**Description:** Show calendar on the given view
**Parameters:**
- `to` (ViewType, required) - The calendar view to display

### viewCalendar

**Scope:** Application
**Description:** Show calendar on the given date
**Parameters:**
- `at` (date, required) - The date to display

### show

**Scope:** Resource (Event)
**Description:** Show the event in the calendar window
**Parameters:** None

## Hierarchy

```
Application
└── calendars (Calendar, rw)
    └── events (Event, rw)
        ├── attendees (Attendee, r)
        ├── displayAlarms (DisplayAlarm, rw)
        ├── mailAlarms (MailAlarm, rw)
        ├── soundAlarms (SoundAlarm, rw)
        └── openFileAlarms (OpenFileAlarm, rw) [deprecated]
```

## TCC Entitlements

Required macOS permissions:
- `calendar` - Access calendar data
- `automation` - Script the Calendar application

## Extraction Notes

### Confidence: 95%

The manifest was extracted from Calendar.app's SDEF with high confidence. Field-level confidence:
- Resources: 100%
- Enums: 100%
- Hierarchy: 95%
- Commands: 95%

### Open Questions

1. **CalendarPriority Usage**: The `CalendarPriority` enum is defined in the SDEF but no properties reference it. Should it be included in the manifest or is it unused in modern Calendar.app?

2. **Standard Suite Commands**: The SDEF includes Standard Suite via `xi:include`. Should commands like `make`, `delete`, `save` be explicitly documented in this manifest or referenced separately?

## Deprecation Notes

### OpenFileAlarm (macOS 10.14+)

Starting with macOS 10.14 (Mojave):
- Cannot create new open file alarms
- Cannot view URLs for existing open file alarms
- Attempting to save or modify open file alarms will result in a save error
- Other aspects of events with existing open file alarms can still be edited (as long as the alarm itself isn't modified)

All `OpenFileAlarm` properties are marked as deprecated with appropriate messages.

## Testing

Run the test suite to validate the manifest:

```bash
pnpm test
```

The test suite includes:
- **Positive tests**: Verify all resources, enums, commands, and hierarchy are correctly defined
- **Negative tests**: Ensure invalid manifests are rejected by the schema
- **Edge cases**: Test complex types, deep nesting, and optional fields
- **Type references**: Validate all enum and resource references are consistent

## Usage

This manifest is used by macts to generate type-safe TypeScript SDKs for Calendar.app automation. It serves as:

1. **Documentation**: Human-readable specification of Calendar.app's scriptable interface
2. **Schema**: Machine-readable format for code generation
3. **Validation**: Zod schemas ensure correctness of the manifest structure

## Related Files

- Source SDEF: `source.sdef`
- Core schemas: `packages/core/src/manifest/schemas/`
- Generated SDK: `packages/sdk-calendar/` (if exists)

## Version

- Manifest version: 1.0
- Bundle ID: com.apple.iCal
- Distribution: system (macOS built-in app)
