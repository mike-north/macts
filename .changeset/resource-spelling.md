---
'@macts/alfred': minor
'@macts/alfred-server': minor
'@macts/automator': minor
'@macts/automator-server': minor
'@macts/bluetooth-file-exchange': minor
'@macts/bluetooth-file-exchange-server': minor
'@macts/calendar': minor
'@macts/calendar-server': minor
'@macts/cli': minor
'@macts/core': minor
'@macts/iterm-server': minor
'@macts/mail': minor
'@macts/mail-server': minor
'@macts/microsoft-edge': minor
'@macts/microsoft-edge-server': minor
'@macts/music': minor
'@macts/music-server': minor
'@macts/omnifocus': minor
'@macts/omnifocus-server': minor
'@macts/omnigraffle': minor
'@macts/omnigraffle-server': minor
'@macts/omniplan': minor
'@macts/omniplan-server': minor
'@macts/photos': minor
'@macts/photos-server': minor
'@macts/preview': minor
'@macts/preview-server': minor
'@macts/quicktime-player-server': minor
'@macts/reminders': minor
'@macts/reminders-server': minor
'@macts/screen-sharing': minor
'@macts/screen-sharing-server': minor
'@macts/shortcuts': minor
'@macts/shortcuts-server': minor
'@macts/system-events': minor
'@macts/system-events-server': minor
'@macts/system-information': minor
'@macts/system-information-server': minor
'@macts/terminal': minor
'@macts/terminal-server': minor
'@macts/textedit': minor
'@macts/textedit-server': minor
'@macts/tv': minor
'@macts/tv-server': minor
'@macts/xcode': minor
'@macts/xcode-server': minor
---

Each resource is now spelled the same way on every public surface.

A resource's segment is the acronym-aware lower camel case of its plural (`MediaItems` → `mediaItems`, `AIMHandles` → `aimHandles`, `URLs` → `urls`). One shared function derives it, and these all use it: routes and operation ids, SDK accessors, MCP tool names, capability names, and the scope segment of derived permissions.

**Breaking for multi-word resources.** These change:

- routes and operation ids: `photos.mediaitems.list` becomes `photos.mediaItems.list`
- SDK accessors: `photos.mediaitems` becomes `photos.mediaItems`
- MCP tool names: `macts__photos__mediaitems_list` becomes `macts__photos__mediaItems_list`
- MCP operation names split acronyms as words: `macts__iterm__app_invoke_a_p_i_expression` becomes `macts__iterm__app_invoke_api_expression`, and `macts__mail__app_get_u_r_l` becomes `macts__mail__app_get_url` (5 tools in iTerm, Mail, QuickTime Player and Screen Sharing)
- derived permissions: for example, `mail:outgoingmessages:send` becomes `mail:outgoingMessages:send`

A permission granted with the old lowercase scope no longer matches. The permission error suggests the correctly spelled one. Single-word resources are unchanged.

Explicit manifest permissions that only restated the derived default are removed, so they can't drift from the derivation. Every route's enforced permission is unchanged except where its spelling changes as above.
