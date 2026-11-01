# Authoring governed macts scripts with `@macts/sdk`

`@macts/sdk` turns an app's contract into a typed client. You create one client
per app, call its methods, and catch the canonical errors. Every call is
verified, permission-checked, and governed by macts before it runs, so a script
contains only its composition logic.

Each app package exposes its contract at the `/contract` subpath, for example
`@macts/calendar/contract`.

## 1. Prerequisites

1. You have an API key with the permissions the script needs:

   ```sh
   macts api-key create --name "my-script" \
     --permission "calendar:calendars:list" \
     --permission "reminders:lists:list" \
     --permission "reminders:reminders:create"
   export MACTS_API_KEY=<token printed above>
   ```

2. `@macts/sdk` and the app packages you need are installed:

   ```sh
   npm install @macts/sdk @macts/calendar @macts/reminders
   ```

3. For remote clients, the macts service is running on the Mac (by default at
   `http://localhost:8372`).

## 2. Quick start

```typescript
import { createClient, resolveClientOptions } from '@macts/sdk'
import { calendarContract } from '@macts/calendar/contract'
import { remindersContract } from '@macts/reminders/contract'

const options = resolveClientOptions()
const calendar = createClient(calendarContract, options)
const reminders = createClient(remindersContract, options)

const calendars = await calendar.calendars.list()
const lists = await reminders.lists.list()
await reminders.reminders.create({
  name: `Review: ${calendars[0]?.name ?? 'calendar'}`,
  listId: lists[0]?.id ?? '',
})
```

`resolveClientOptions()` reads `MACTS_API_KEY` (required) and `MACTS_API_URL`
(optional, default `http://localhost:8372`) and returns `{ token, url }`.

## 3. Remote or local

| Import             | Runs operations               | Options                             |
| ------------------ | ----------------------------- | ----------------------------------- |
| `@macts/sdk`       | On a macts service, over HTTP | `{ token, url, fetch? }`            |
| `@macts/sdk/local` | In this process, on this Mac  | `{ token, governance?, executor? }` |

Both factories are named `createClient`, take the same contract, and return the
same client. Switching locality changes only the import and the options object;
method calls, values, and `catch` blocks stay the same.

```typescript
import { createClient } from '@macts/sdk/local'
import { calendarContract } from '@macts/calendar/contract'

const calendar = createClient(calendarContract, { token: process.env.MACTS_API_KEY ?? '' })
const calendars = await calendar.calendars.list()
```

A local client is governed exactly like a remote one. It verifies the token,
checks the key's permissions, and enforces this Mac's governance policy and
audit log from `MACTS_HOME` before anything runs. There is no shortcut for
local callers.

`@macts/sdk` never loads the Mac-side runtime, so a remote client runs anywhere
Node runs. `@macts/sdk/local` is for code that runs on the Mac whose apps it
automates.

## 4. Environment variables

| Variable        | Required | Default                 | Description                    |
| --------------- | -------- | ----------------------- | ------------------------------ |
| `MACTS_API_KEY` | Yes      | —                       | API key token (`macts_sk_...`) |
| `MACTS_API_URL` | No       | `http://localhost:8372` | Root URL of the macts service  |

## 5. Capability → client mapping

The dotted names from `macts capabilities search` map directly to a client and
its methods:

```
$ macts capabilities search events
calendar.events.create      write  calendar:events:create
calendar.events.list        read   calendar:events:list
reminders.reminders.create  write  reminders:reminders:create
```

```typescript
// calendar.events.create  →  the calendar client's events.create(...)
const calendar = createClient(calendarContract, resolveClientOptions())
await calendar.events.create({ ... })
```

The first segment names the app package (`@macts/calendar`), and the rest is the
method path on that app's client.

## 6. Worked multi-op example (Calendar + Reminders)

This example composes three operations across two apps:

```typescript
// scripts/calendar-reminder.ts
import { createClient, MactsError, resolveClientOptions } from '@macts/sdk'
import { calendarContract } from '@macts/calendar/contract'
import { remindersContract } from '@macts/reminders/contract'

async function main() {
  // Token and URL come from MACTS_API_KEY and MACTS_API_URL.
  const options = resolveClientOptions()
  const calendar = createClient(calendarContract, options)
  const reminders = createClient(remindersContract, options)

  // Capability: calendar.calendars.list (permission: calendar:calendars:list)
  const calendars = await calendar.calendars.list()
  console.log(`Found ${String(calendars.length)} calendar(s)`)

  // Capability: reminders.lists.list (permission: reminders:lists:list)
  const lists = await reminders.lists.list()
  const inbox = lists.find((list) => list.name === 'Reminders') ?? lists[0]
  if (!inbox) throw new Error('No reminder lists found')

  // Capability: reminders.reminders.create (permission: reminders:reminders:create)
  const reminder = await reminders.reminders.create({
    name: `Review calendar: ${calendars[0]?.name ?? 'unknown'}`,
    listId: inbox.id,
  })
  console.log(`Created reminder: ${reminder.name}`)
}

main().catch((error: unknown) => {
  if (error instanceof MactsError) {
    console.error(`Script failed (${error.code}): ${error.message}`)
  } else {
    console.error('Script failed:', error)
  }
  process.exit(1)
})
```

Run it:

```sh
export MACTS_API_KEY=macts_sk_...
npx tsx scripts/calendar-reminder.ts
```

## 7. Governance and errors

You do not add any governance logic to a script; macts applies it to every call.
Failures are thrown as canonical error classes, exported from both `@macts/sdk`
and `@macts/sdk/local`. They all extend `MactsError`, carry a `code`, and carry
structured `details`.

```typescript
import {
  PermissionDeniedError,
  PolicyDeniedError,
  TargetNotFoundError,
  TransportError,
} from '@macts/sdk'

try {
  await calendar.events.create({ ... })
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    console.error(`The API key lacks ${error.details.required}`)
  } else if (error instanceof PolicyDeniedError) {
    console.error(`Blocked by the ${error.details.layer} governance policy`)
  } else if (error instanceof TargetNotFoundError) {
    console.error('That item does not exist')
  } else if (error instanceof TransportError) {
    console.error(`Could not reach the macts service (${error.details.reason})`)
  } else {
    throw error
  }
}
```

Common classes:

| Class                   | `code`              | Meaning                                                      |
| ----------------------- | ------------------- | ------------------------------------------------------------ |
| `ValidationError`       | `VALIDATION_FAILED` | An input violated the operation's contract; nothing ran      |
| `AuthenticationError`   | `UNAUTHENTICATED`   | The token is missing, malformed, expired, or revoked         |
| `PermissionDeniedError` | `PERMISSION_DENIED` | The API key lacks the operation's permission                 |
| `PolicyDeniedError`     | `POLICY_DENIED`     | A governance policy forbids the call                         |
| `ApprovalPendingError`  | `APPROVAL_PENDING`  | The call needs a human's confirmation and nobody can give it |
| `TargetNotFoundError`   | `TARGET_NOT_FOUND`  | The item the call targets does not exist                     |
| `UnexpectedValueError`  | `UNEXPECTED_VALUE`  | The app returned a value outside the operation's contract    |
| `TransportError`        | `TRANSPORT_FAILED`  | A remote client could not get a usable response              |

Because both entry points export the same classes, a `catch` block written for
a remote client works unchanged for a local one. A `switch (error.code)` over
an `AnyMactsError` narrows `details` for each code.
