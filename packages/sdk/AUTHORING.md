# Authoring governed macts scripts with `@macts/sdk`

`@macts/sdk` is the Rung-1 scripting entry point. It resolves the API key and
base URL once from the environment and hands back ready-to-use, fully-typed
clients for every installed `@macts/<app>` SDK — so a composed script is
**just the composition logic**, with no boilerplate.

## 1. Prerequisites

1. The macts daemon is running (`macts mcp start`).
2. You have an API key with the required permissions:

   ```sh
   macts api-key create --name "my-script" --permission "*:*:*"
   export MACTS_API_KEY=<token printed above>
   ```

3. `@macts/sdk` and the app SDKs you need are installed:

   ```sh
   npm install @macts/sdk @macts/calendar @macts/reminders
   ```

## 2. Quick start

```typescript
import { createMactsClients } from '@macts/sdk'

const m = createMactsClients()

// List all calendars, then create a reminder to review the first one
const calendars = await m.calendar.calendars.list()
const lists = await m.reminders.lists.list()
await m.reminders.reminders.create({
  name: `Review: ${calendars[0]?.name ?? 'calendar'}`,
  listId: lists[0]?.id ?? '',
})
```

`createMactsClients()` reads `MACTS_API_KEY` (required) and `MACTS_API_URL`
(optional, default `http://localhost:8372`), then returns a map of clients.

## 3. Environment variables

| Variable        | Required | Default                 | Description                          |
| --------------- | -------- | ----------------------- | ------------------------------------ |
| `MACTS_API_KEY` | Yes      | —                       | API key token (`macts_sk_...`)       |
| `MACTS_API_URL` | No       | `http://localhost:8372` | Custom daemon address (host or port) |

## 4. Capability → SDK mapping

The dotted names from `macts capabilities search` map directly to client
properties:

```
$ macts capabilities search events
calendar.events.create   write   calendar:events:create
calendar.events.list     read    calendar:events:list
reminders.reminders.create  write  reminders:reminders:create
```

```typescript
const m = createMactsClients()
//        ^ app     ^ resource ^ operation
await m.calendar  .events    .create({ ... })
await m.reminders .reminders .create({ ... })
```

Available app clients:

| `m.<key>`                 | Package                          | App                     |
| ------------------------- | -------------------------------- | ----------------------- |
| `m.alfred`                | `@macts/alfred`                  | Alfred                  |
| `m.arc`                   | `@macts/arc`                     | Arc                     |
| `m.automator`             | `@macts/automator`               | Automator               |
| `m.bluetoothFileExchange` | `@macts/bluetooth-file-exchange` | Bluetooth File Exchange |
| `m.calendar`              | `@macts/calendar`                | Calendar                |
| `m.console`               | `@macts/console`                 | Console                 |
| `m.contacts`              | `@macts/contacts`                | Contacts                |
| `m.finder`                | `@macts/finder`                  | Finder                  |
| `m.googleChrome`          | `@macts/google-chrome`           | Google Chrome           |
| `m.iterm`                 | `@macts/iterm`                   | iTerm2                  |
| `m.mail`                  | `@macts/mail`                    | Mail                    |
| `m.messages`              | `@macts/messages`                | Messages                |
| `m.microsoftEdge`         | `@macts/microsoft-edge`          | Microsoft Edge          |
| `m.microsoftWord`         | `@macts/microsoft-word`          | Microsoft Word          |
| `m.music`                 | `@macts/music`                   | Music                   |
| `m.notes`                 | `@macts/notes`                   | Notes                   |
| `m.omnifocus`             | `@macts/omnifocus`               | OmniFocus               |
| `m.omnigraffle`           | `@macts/omnigraffle`             | OmniGraffle             |
| `m.omniplan`              | `@macts/omniplan`                | OmniPlan                |
| `m.photos`                | `@macts/photos`                  | Photos                  |
| `m.preview`               | `@macts/preview`                 | Preview                 |
| `m.quicktimePlayer`       | `@macts/quicktime-player`        | QuickTime Player        |
| `m.reminders`             | `@macts/reminders`               | Reminders               |
| `m.safari`                | `@macts/safari`                  | Safari                  |
| `m.screenSharing`         | `@macts/screen-sharing`          | Screen Sharing          |
| `m.scriptEditor`          | `@macts/script-editor`           | Script Editor           |
| `m.shortcuts`             | `@macts/shortcuts`               | Shortcuts               |
| `m.spotify`               | `@macts/spotify`                 | Spotify                 |
| `m.systemEvents`          | `@macts/system-events`           | System Events           |
| `m.systemInformation`     | `@macts/system-information`      | System Information      |
| `m.systemSettings`        | `@macts/system-settings`         | System Settings         |
| `m.terminal`              | `@macts/terminal`                | Terminal                |
| `m.textedit`              | `@macts/textedit`                | TextEdit                |
| `m.tv`                    | `@macts/tv`                      | TV                      |
| `m.xcode`                 | `@macts/xcode`                   | Xcode                   |

## 5. Worked multi-op example (Calendar + Reminders)

This example composes three operations across two apps. It demonstrates:

- Key auto-resolution (no `apiKey` in the script body)
- Cross-app composition
- Governance inheritance (every call goes through the governed API)

```typescript
// scripts/calendar-reminder.ts
import { createMactsClients } from '@macts/sdk'

async function main() {
  // Key is resolved from MACTS_API_KEY — nothing to configure here
  const m = createMactsClients()

  // Op 1: discover what calendars exist
  // Capability: calendar.calendars.list (permission: calendar:calendars:list)
  const calendars = await m.calendar.calendars.list()
  console.log(`Found ${String(calendars.length)} calendar(s)`)

  // Op 2: discover what reminder lists exist
  // Capability: reminders.lists.list (permission: reminders:lists:list)
  const lists = await m.reminders.lists.list()
  const inbox = lists.find((l) => l.name === 'Reminders') ?? lists[0]
  if (!inbox) throw new Error('No reminder lists found')

  // Op 3: create a reminder referencing the first calendar
  // Capability: reminders.reminders.create (permission: reminders:reminders:create)
  const firstCal = calendars[0]
  const reminder = await m.reminders.reminders.create({
    name: `Review calendar: ${firstCal?.name ?? 'unknown'}`,
    listId: inbox.id,
  })
  console.log(`Created reminder: ${reminder.name} (id: ${reminder.id})`)
}

main().catch((err: unknown) => {
  // A policy-denied op surfaces here as an error with .code === 'GOVERNANCE_DENIED'
  // or 'PERMISSION_DENIED', depending on which layer blocked it.
  console.error('Script failed:', err)
  process.exit(1)
})
```

Run it:

```sh
export MACTS_API_KEY=macts_sk_...
npx tsx scripts/calendar-reminder.ts
```

## 6. Governance and errors

Every client call is routed through the macts API server where the active
governance policy is applied. You do **not** need to add any governance logic to
the script — it is inherited automatically.

A policy-denied operation throws with `code: 'GOVERNANCE_DENIED'`:

```typescript
import { CalendarError } from '@macts/calendar'

try {
  await m.calendar.events.create({ ... })
} catch (err) {
  if (err instanceof CalendarError && err.code === 'GOVERNANCE_DENIED') {
    console.error('Blocked by governance policy')
  }
}
```

A missing API key permission throws with `code: 'PERMISSION_DENIED'`.

## 7. Lower-level access

If you need to call a single app without the full aggregator, import the client
directly from the app package:

```typescript
import { CalendarClient } from '@macts/calendar'
import { resolveConnectionOptions } from '@macts/sdk'

// Resolve key/URL the same way createMactsClients() does
const opts = resolveConnectionOptions()
const calendar = new CalendarClient(opts)
const calendars = await calendar.calendars.list()
```

`resolveConnectionOptions()` is the canonical resolver for both the key and the
base URL. Use it anywhere you construct a client manually.
