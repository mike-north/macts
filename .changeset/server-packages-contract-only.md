---
'@macts/alfred-server': minor
'@macts/arc-server': minor
'@macts/automator-server': minor
'@macts/bluetooth-file-exchange-server': minor
'@macts/calendar-server': minor
'@macts/console-server': minor
'@macts/contacts-server': minor
'@macts/finder-server': minor
'@macts/google-chrome-server': minor
'@macts/iterm-server': minor
'@macts/mail-server': minor
'@macts/messages-server': minor
'@macts/microsoft-edge-server': minor
'@macts/microsoft-word-server': minor
'@macts/music-server': minor
'@macts/notes-server': minor
'@macts/omnifocus-server': minor
'@macts/omnigraffle-server': minor
'@macts/omniplan-server': minor
'@macts/photos-server': minor
'@macts/preview-server': minor
'@macts/quicktime-player-server': minor
'@macts/reminders-server': minor
'@macts/safari-server': minor
'@macts/screen-sharing-server': minor
'@macts/script-editor-server': minor
'@macts/shortcuts-server': minor
'@macts/spotify-server': minor
'@macts/system-events-server': minor
'@macts/system-information-server': minor
'@macts/system-settings-server': minor
'@macts/terminal-server': minor
'@macts/textedit-server': minor
'@macts/tv-server': minor
'@macts/xcode-server': minor
---

Server packages are now contract-only. Each re-exports its app's generated contract from `@macts/<app>/contract` as `contract`, and depends only on `@macts/<app>`. The `./mcp` export (the generated MCP plugin) and the `plugin` export (the HTTP API plugin with its embedded manifest) are removed, along with the dependencies on `@macts/api`, `@macts/core` and `@macts/types`. A macts host serves the app from the contract and the app's manifest. The package's `types` entry now points at the declarations the build emits.
