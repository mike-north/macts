# @macts/sdk

## 0.2.0

## 0.1.0

### Minor Changes

- ced442a: Add `@macts/sdk` — frictionless authoring helper for governed macts scripts.

  `createMactsClients()` resolves `MACTS_API_KEY` and `MACTS_API_URL` once from
  the environment and returns a fully-typed client map for every installed
  `@macts/<app>` SDK, so a composed script contains only the composition logic:

  ```typescript
  import { createMactsClients } from '@macts/sdk'

  const m = createMactsClients()
  const calendars = await m.calendar.calendars.list()
  const lists = await m.reminders.lists.list()
  await m.reminders.reminders.create({
    name: `Review: ${calendars[0]?.name ?? 'calendar'}`,
    listId: lists[0]?.id ?? '',
  })
  ```

  Client property names match the app-prefix of dotted capability names returned
  by `macts capabilities search`, making "find a capability → compose it" a
  direct mapping. Governance is inherited automatically — every call routes
  through the governed API and a policy-denied operation surfaces as an error
  thrown by the client method.
