---
name: macts-compose-and-reuse
description: >
  Decision ladder and compose-and-reuse pattern for agents working with
  macts-governed macOS automation. Teaches when to compose a script vs. use
  direct interaction, how to discover existing capabilities, how to author a
  governed script with @macts/sdk, and how to turn an approved script into a
  reusable skill.
---

# macts Compose-and-Reuse

**The core rule:** prefer composing one governed `@macts/sdk` script over
pixel-pushing, over screenshotting, and over N chatty per-operation calls.
A composed script is cheaper in tokens, more reliable under UI changes, and
fully auditable — every call goes through the permission layer automatically.

When you are about to automate anything on the user's Mac, work through the
decision ladder below before doing anything else.

---

## Decision Ladder

### Rung 1 — One-off or low-risk task

If the task is unusual, very low risk, and clearly will not repeat, direct
per-operation calls via the MCP tools or CLI are fine. Skip scripting.

**Signal:** the user says "just this once" or the task has no obvious recurring
pattern.

### Rung 2 — Existing capability is available

If macts already exposes the capability, use it. **Do not screenshot or click
through the UI.**

Steps:

1. Search for the capability:

   ```sh
   macts capabilities search "<intent>"
   ```

   Example:

   ```sh
   macts capabilities search "create calendar event"
   ```

2. If a match looks right, inspect it for the full schema and required
   permission:

   ```sh
   macts capabilities inspect <capability-name>
   ```

   Example:

   ```sh
   macts capabilities inspect calendar.events.create
   ```

3. Check that your API key includes the required permission (shown in the
   inspect output as `permission: calendar:events:create`). If not, request
   it with `--permission calendar:events:create` when creating a new key.

4. Call the capability directly via the MCP tool or as a one-liner if this
   is a single operation. For two or more operations — especially cross-app —
   go to Rung 3.

### Rung 3 — Repeated workflow (the default for repeatable work)

**This is the headline pattern.** If the user has asked for this kind of work
before, or will likely ask again, or the task touches more than one app:

1. **Discover** all required capabilities with `macts capabilities search`.

2. **Compose** a single TypeScript script using `@macts/sdk`. Create one
   client per app from that app's contract; app packages expose their contract
   at the `/contract` subpath:

   ```typescript
   // scripts/my-workflow.ts
   import { createClient, PolicyDeniedError, resolveClientOptions } from '@macts/sdk'
   import { calendarContract } from '@macts/calendar/contract'
   import { remindersContract } from '@macts/reminders/contract'

   const options = resolveClientOptions()
   const calendar = createClient(calendarContract, options)
   const reminders = createClient(remindersContract, options)

   // All ops in one script — one execution, N operations
   try {
     const calendars = await calendar.calendars.list()
     const lists = await reminders.lists.list()
     await reminders.reminders.create({
       name: `Review: ${calendars[0]?.name ?? 'calendar'}`,
       listId: lists[0]?.id ?? '',
     })
   } catch (error) {
     if (error instanceof PolicyDeniedError) {
       console.error(`Blocked by governance: ${error.details.permission}`)
     } else {
       throw error
     }
   }
   ```

   `resolveClientOptions()` reads `MACTS_API_KEY` and `MACTS_API_URL` from the
   environment — no credentials in the script body. A script that runs on the
   Mac itself can import `createClient` from `@macts/sdk/local` instead and pass
   `{ token }`; the client, the calls, and the error classes are the same, and
   every call is governed the same way.

   Older scripts that call `createMactsClients()` no longer run: that factory
   is gone. Rewrite each `m.<app>` as a client created from that app's
   contract. The methods do not change:

   ```typescript
   // Before: one map of every app's client, configured from the environment.
   import { createMactsClients } from '@macts/sdk'

   const m = createMactsClients()
   const calendars = await m.calendar.calendars.list()

   // After: one client per app, created from that app's contract.
   import { createClient, resolveClientOptions } from '@macts/sdk'
   import { calendarContract } from '@macts/calendar/contract'

   const calendar = createClient(calendarContract, resolveClientOptions())
   const calendars = await calendar.calendars.list()
   ```

3. **Show the script to the user and ask for approval.** (Your harness's
   job — macts does not run the script.) Explain what each operation does and
   what permissions it requires.

4. **Save the approved script as a reusable skill** in your harness. Next time
   the user asks for the same workflow, run the saved script directly without
   re-authoring it.

This is the compounding toolbelt: each approved script becomes a durable,
governed automation the agent can reuse indefinitely.

### Rung 4 — Capability is missing (not yet path)

If `macts capabilities search` returns no matches and the capability genuinely
does not exist, the path is to generate a new one from the app manifest — not
to fall back to UI automation. This is a future capability (track in the issue
queue); for now, note the gap to the user.

---

## Why this order matters

| Path                | Tokens                                        | Reliability                       | Auditable                                             |
| ------------------- | --------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| Screenshot + click  | Very high (visual context, many turns)        | Fragile (layout changes break it) | No                                                    |
| N per-op calls      | High (one model turn per op)                  | Moderate                          | Partial                                               |
| One composed script | Low (one turn to author, zero turns to reuse) | High (API-level, not pixel-level) | Yes — every call is logged against a named permission |

Governance is inherited automatically: every client call is verified,
permission-checked, and checked against the active policy, whether the client
is remote or local. You do not add any permission logic to the script. Denials
arrive as canonical error classes (`PermissionDeniedError`,
`PolicyDeniedError`, and the rest), so a script can `catch` them with
`instanceof`.

---

## Permission format reference

Permissions follow `app:resource:operation`.

Operations are: `list`, `get`, `show`, `create`, `delete`, `update`.

Examples:

- `calendar:events:create` — create Calendar events
- `reminders:lists:list` — list Reminder lists
- `calendar:events:*` — all operations on calendar events
- `calendar:*:*` — all operations in the calendar app

To create an API key with the right permissions:

```sh
macts api-key create \
  --name "my-script" \
  --permission "calendar:events:create" \
  --permission "reminders:lists:list" \
  --permission "reminders:reminders:create"
export MACTS_API_KEY=<token printed above>
```

`--permission` is repeatable. There is no `read` operation — use `list`,
`get`, or `show` as appropriate.

---

## Capability-to-SDK mapping

The dotted name from `macts capabilities search` names the app package and the
method path on that app's client:

```
capability name          → client                                    → call
calendar.events.create   → createClient(calendarContract, options)   → .events.create({ ... })
reminders.lists.list     → createClient(remindersContract, options)  → .lists.list()
finder.files.show        → createClient(finderContract, options)     → .files.show({ ... })
```

Each contract comes from its app package's `/contract` subpath, for example
`@macts/calendar/contract`.

Full worked example — see `packages/sdk/AUTHORING.md` for the complete
multi-op reference with governance and error-handling notes.

---

## Quick-start checklist

- [ ] Run `macts capabilities search "<intent>"` before reaching for the UI.
- [ ] Inspect the best match with `macts capabilities inspect <name>`.
- [ ] For 2+ operations or any recurring task, compose one script with
      `createClient(<app>Contract, resolveClientOptions())` from `@macts/sdk`.
- [ ] Show the script to the user; get explicit approval.
- [ ] Save the approved script as a reusable skill in your harness.
- [ ] Never hardcode credentials — always use `MACTS_API_KEY`.
- [ ] Never use `read` as an operation — use `list`, `get`, or `show`.
