---
'@macts/automator': patch
'@macts/calendar': patch
'@macts/contacts': patch
'@macts/mail': patch
'@macts/microsoft-edge': patch
'@macts/microsoft-word': patch
'@macts/music': patch
'@macts/notes': patch
'@macts/omnifocus': patch
'@macts/omnigraffle': patch
'@macts/omniplan': patch
'@macts/photos': patch
'@macts/preview': patch
'@macts/reminders': patch
'@macts/script-editor': patch
'@macts/shortcuts': patch
'@macts/system-information': patch
'@macts/system-settings': patch
'@macts/terminal': patch
'@macts/textedit': patch
'@macts/xcode': patch
---

Generated CLI commands now name the identifier that addresses an item, instead of always saying "ID". The arguments and their order are unchanged.

- A `get` command's description names it: "Get a playlist by persistent ID", "Get a document by name". It is the item's own identifying field, which can differ from the parameter's name: a calendar is looked up by its name.
- In help, the item argument of a `get` command, and of any other command on one item, is labeled with it: `macts music playlists get <persistent-id>` instead of `<playlistId>`.
- Descriptions use "an" before a vowel: "Get an event by uid".
