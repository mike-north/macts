# Live verification: `calendars.list()` → `events.create({ calendarId })`

**Type:** locally-automatable end-to-end test — **NOT run in CI.**

## Why this cannot run in CI

It requires a live macOS desktop with **Calendar.app** installed and signed in,
the **macts API server running locally** (`macts --serve`), and a scoped macts
API key. GitHub Actions runners cannot drive Calendar.app, so this step is gated
to a local operator. The CI-covered portion (the generated `list` JXA reads the
manifest identifier and exposes the canonical `id`; the read type surfaces `id`;
the canonical name matches the manifest single source) lives in:

- `packages/api/src/server/handlers/rpc-list-identifier.test.ts`
- `packages/core/src/manifest/identifier.test.ts`
- `packages/core/src/generator/sdk/list-identifier.test.ts`

This document covers the one thing those cannot: that the identifier the live
app returns is **non-empty** and is **accepted** by the create route.

## What it verifies (acceptance for #32)

A value obtained from `calendars.list()` can be passed straight into
`events.create({ calendarId, ... })` and the create succeeds — i.e. list output
populates the identifier sibling write operations require, under a usable name.

## Preconditions

1. macOS with Calendar.app, signed into at least one **writable** calendar.
2. Calendar automation permission granted to the macts server process.
3. macts API server running locally:
   ```sh
   macts --serve            # default http://localhost:8372
   ```
4. A scoped API key with `calendar:calendars:list` and `calendar:events:create`.

## Procedure

```sh
export MACTS_API_KEY=...          # scoped key
export MACTS_BASE_URL=http://localhost:8372
```

```ts
import { CalendarClient } from '@macts/calendar'

const client = new CalendarClient({
  apiKey: process.env.MACTS_API_KEY!,
  baseUrl: process.env.MACTS_BASE_URL, // falls back to http://localhost:8372 when unset
})

// 1. List calendars and take the canonical identifier of a writable one.
const calendars = await client.calendars.list()
const target = calendars.find((c) => c.writable) ?? calendars[0]

// 2. The canonical `id` must be populated (this is the gap #32 closes).
if (!target?.id) {
  throw new Error('FAIL: calendars.list() returned no usable identifier (id was empty)')
}

// 3. Pass it straight into the create route as calendarId.
const event = await client.events.create({
  calendarId: target.id,
  summary: 'macts live-verification event',
  startDate: '2026-01-01T10:00:00Z',
  endDate: '2026-01-01T11:00:00Z',
})

console.log('PASS: created event', event)
```

## Pass / fail

- **PASS:** `target.id` is a non-empty string and `events.create` returns a
  created event (HTTP 200, no `VALIDATION_ERROR` / `NOT_FOUND`).
- **FAIL — empty id:** `calendars.list()` items have no `id` → the list executor
  did not populate the manifest identifier. Re-check
  `resolveListOutputProperties` / `buildListCommandCode`.
- **FAIL — create rejects the id:** the create route does not accept the value
  list returned → the identifier representation drifted from what the create
  route validates. Re-check the manifest's `Calendar.identifiers` primary entry
  vs the `calendarId` parameter mapping.

## Cleanup

Remove the created event in Calendar.app. (This check only exercises
`calendars.list()` → `events.create()`; it does not depend on an API delete
path — `events.delete` may not be exposed on the generated SDK and `create` does
not guarantee a populated `event.id`.)
