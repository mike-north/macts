# Live verification: name-targeted Calendar `events.create → list/get → delete`

**Type:** locally-automatable end-to-end test — **NOT run in CI.**

This is the live, real-app verification for issue #81: the Calendar resource is now
targeted by a **runtime-working** identifier (`name`, via a `whose({ name })[0]`
lookup) instead of the dictionary-declared `calendarIdentifier`, which throws via
JXA. CI covers the generated-program text and the schema/resolver behavior; only a
real Mac can confirm the generated JXA actually round-trips against Calendar.app.

## Why this cannot run in CI

It requires a live macOS desktop with **Calendar.app** installed and signed in, the
**macts API server running locally** (`macts --serve`), and a scoped macts API key.
GitHub Actions runners cannot drive Calendar.app, so this step is gated to a local
operator. The CI-covered portion lives in:

- `packages/core/src/manifest/schemas/resource.test.ts` — the `targeting` schema field
- `packages/core/src/manifest/identifier.test.ts` — `resolveIdentifierTargeting`
- `packages/core/src/generator/sdk/list-identifier.test.ts` — canonical id mirrors `name`
- `packages/api/src/server/handlers/rpc-list-identifier.test.ts` — `buildTargetExpression`
  emits `whose({ name: ... })[0]`; list sources the canonical id from `name` unswallowed
- `packages/api/src/server/handlers/rpc-calendar-id-param.test.ts` — full RPC path:
  Calendar get/listEvents/createEvent target the calendar by name; Events stay byId

This document covers the one thing those cannot: that the name-targeted JXA the
server emits **actually resolves a live calendar** and lets an event be created,
read back, and removed.

## What it verifies (acceptance for #81 asks #1 + #3)

Against a live Calendar.app, using a calendar addressed by **name**:

1. `events.create({ calendarId: <calendar name>, ... })` succeeds (the parent
   calendar is resolved via `whose({ name })[0]`, not a `byId()` that throws).
2. The created event is observable via `events.list({ calendarId })` and
   `events.get({ id: <event uid> })` (Event `uid` IS runtime-valid).
3. The event is removable (delete step — see note below).

## Preconditions

1. macOS with Calendar.app, signed into at least one **writable** calendar. Note
   the calendar's display **name** (e.g. `Work`) — that is the identifier now.
2. Calendar automation permission granted to the macts server process.
3. macts API server running locally:
   ```sh
   macts --serve            # default http://localhost:8372
   ```
4. A scoped API key with `calendar:calendars:list`, `calendar:events:create`,
   `calendar:events:list`, and `calendar:events:get`.

## Procedure

```sh
export MACTS_API_KEY=...          # scoped key
export MACTS_BASE_URL=http://localhost:8372
export MACTS_CALENDAR_NAME=Work   # the display name of a writable calendar
```

```ts
import { CalendarClient } from '@macts/calendar'

const client = new CalendarClient({
  apiKey: process.env.MACTS_API_KEY!,
  baseUrl: process.env.MACTS_BASE_URL, // falls back to http://localhost:8372 when unset
})

const calendarName = process.env.MACTS_CALENDAR_NAME!

// 1. Confirm the calendar is listable and addressable by name. The canonical
//    `id` is now sourced from `name` (the runtime-working property).
const calendars = await client.calendars.list()
const target = calendars.find((c) => c.name === calendarName)
if (!target?.id) {
  throw new Error(`FAIL: calendar "${calendarName}" not found or has no usable id`)
}
// The canonical id mirrors the name for a byProperty resource.
if (target.id !== calendarName) {
  throw new Error(`FAIL: expected canonical id to equal the name, got "${target.id}"`)
}

// 2. Create an event in that calendar, targeting the calendar BY NAME.
const created = await client.events.create({
  calendarId: calendarName, // value passed to whose({ name: ... })[0] server-side
  summary: 'macts #81 live-verification event',
  startDate: '2026-01-01T10:00:00Z',
  endDate: '2026-01-01T11:00:00Z',
})
console.log('PASS create:', created)

// 3. List the events in that calendar and confirm the new one is present.
const events = await client.events.list(calendarName)
const found = events.find((e) => e.summary === 'macts #81 live-verification event')
if (!found?.id) {
  throw new Error('FAIL: created event not found via events.list (or has no uid)')
}

// 4. Read it back by its uid (Event uid IS runtime-valid → byId targeting).
const fetched = await client.events.get(found.id)
console.log('PASS get:', fetched)
```

## Delete step (note)

The shipped Calendar manifest does **not** declare a `deleteEvent` command, so the
generated `@macts/calendar` SDK exposes no `events.delete`. The proven delete path
from issue #81 targets the calendar by name and removes the event directly via JXA:

```sh
osascript -l JavaScript -e '
  const a = Application("com.apple.iCal");
  const cal = a.calendars.whose({ name: "Work" })[0];
  const ev = cal.events.whose({ summary: "macts #81 live-verification event" })[0];
  ev.delete();
'
```

Exposing `deleteEvent` through the structured layer (so the round-trip closes
entirely through the SDK) is follow-up work tracked separately; it is out of scope
for #81 asks #1/#3.

## Pass / fail

- **PASS:** create returns an event, `events.list`/`events.get` observe it, and the
  JXA delete removes it — all while addressing the calendar by **name**.
- **FAIL — calendar not resolved:** `events.create` errors resolving the parent →
  the name-targeted `whose({ name })[0]` lookup did not find the calendar. Re-check
  `buildTargetExpression` and the manifest `Calendar.identifiers` (`name`/`byProperty`).
- **FAIL — empty calendar id:** `calendars.list()` items have no `id` → the list
  executor did not source the canonical id from the runtime property. Re-check
  `buildListCommandCode` / `resolveIdentifierTargeting`.

## Cleanup

Remove the created event (the delete step above does this). The check creates a
single event and removes it; no other state is modified.
