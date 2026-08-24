# @macts/sdk

## 1.0.0

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

### Patch Changes

- Updated dependencies [4851845]
- Updated dependencies [4898fbd]
- Updated dependencies [b72513a]
- Updated dependencies [4851845]
  - @macts/calendar@1.0.0
  - @macts/iterm@1.0.0
  - @macts/microsoft-word@1.0.0
  - @macts/music@1.0.0
  - @macts/tv@1.0.0
  - @macts/omniplan@1.0.0
  - @macts/reminders@1.0.0
  - @macts/alfred@1.0.0
  - @macts/arc@1.0.0
  - @macts/automator@1.0.0
  - @macts/bluetooth-file-exchange@1.0.0
  - @macts/console@1.0.0
  - @macts/contacts@1.0.0
  - @macts/finder@1.0.0
  - @macts/google-chrome@1.0.0
  - @macts/mail@1.0.0
  - @macts/messages@1.0.0
  - @macts/microsoft-edge@1.0.0
  - @macts/notes@1.0.0
  - @macts/omnifocus@1.0.0
  - @macts/omnigraffle@1.0.0
  - @macts/photos@1.0.0
  - @macts/preview@1.0.0
  - @macts/quicktime-player@1.0.0
  - @macts/safari@1.0.0
  - @macts/screen-sharing@1.0.0
  - @macts/script-editor@1.0.0
  - @macts/shortcuts@1.0.0
  - @macts/spotify@1.0.0
  - @macts/system-events@1.0.0
  - @macts/system-information@1.0.0
  - @macts/system-settings@1.0.0
  - @macts/terminal@1.0.0
  - @macts/textedit@1.0.0
  - @macts/xcode@1.0.0
