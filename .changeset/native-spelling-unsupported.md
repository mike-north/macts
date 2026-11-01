---
'@macts/core': minor
'@macts/automator': minor
'@macts/automator-server': minor
'@macts/console': minor
'@macts/console-server': minor
'@macts/contacts': minor
'@macts/contacts-server': minor
'@macts/finder': minor
'@macts/finder-server': minor
'@macts/google-chrome': minor
'@macts/google-chrome-server': minor
'@macts/iterm': minor
'@macts/iterm-server': minor
'@macts/mail': minor
'@macts/mail-server': minor
'@macts/music': minor
'@macts/music-server': minor
'@macts/reminders': minor
'@macts/reminders-server': minor
'@macts/screen-sharing': minor
'@macts/screen-sharing-server': minor
'@macts/system-events': minor
'@macts/system-events-server': minor
---

App manifests can now record the app's own spelling of a term and mark what the app does not have, and native operations use both.

- **Native spellings.** A resource can name its collection as the app spells it (`native.collection`), and a property its field (`native.name`). Native bodies address the app by those names and return records under the public keys. Music's AirPlay devices are reached as `airplayDevices`, and 23 fields in Google Chrome, iTerm, Mail, Music and System Events (such as `url`, `ansiBlackColor` and `macAddress`) are read under the app's spelling.
- **Unsupported resources and commands.** A resource or command can be marked unsupported, with the evidence for it: the app's dictionary has no such class or element, or a live read failed with a recorded error. A marked resource or command gets no route, no permission, and no generated operation or type. Screen Sharing connections, Console devices, Finder desktop and trash objects, and Contacts instant messages are marked, as are Automator's `getSetting` and `getRequiredResource`.
- **Top-level collections.** The Reminders and Automator manifests now record that reminders, and Automator's actions and variables, are collections of the application itself, as live counts confirm. No route changes.

Breaking for callers of what is removed: the Screen Sharing connections `list` and `get` operations and the Automator `settings get` and `requiredResources get` operations, with their permissions; and the exported types and schemas for Console `Device`, Finder `DesktopObject` and `TrashObject`, Contacts `InstantMessage`, and Screen Sharing `Connection`.
