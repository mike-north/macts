---
'@macts/core': minor
'@macts/arc': minor
'@macts/finder': minor
'@macts/google-chrome': minor
'@macts/iterm': minor
'@macts/mail': minor
'@macts/messages': minor
'@macts/system-events': minor
'@macts/tv': minor
'@macts/xcode': minor
---

Generated contracts leave out, for now, an output field holding a reference that macts cannot yet return in a form a caller can resolve. Each is a gap in what macts covers, not something the app cannot do. Restoring them is planned under #219, and each field comes back on regeneration once macts provides a way to read its target. A field is left out when it references:

- a resource macts has no get for yet;
- a resource macts has no identifier for yet;
- a resource the app finds only within its container. macts does not yet return a reference with its container (#242);
- or a resource macts identifies by its name, when the manifest has no evidence yet that the name is unique. Such a reference resolves to whichever object has that name, which may not be the one the app returned. A primary identifier claimed `unique: true`, with its evidence, counts as identity.

A field left out is not declared by the contract's record type or value type, and native reads do not read it. It is also gone from the HTTP client's read type and schema and from what the CLI prints. Input types are unchanged, so a writable field may still be set. Generation warns once per field left out. The warning names the app, the field, the referenced resource and what macts does not provide yet, for example: macts has no get for "Mailbox" yet. The same rule applies to a command result, but no manifest records one yet. The generator's tests pin every field left out, as a ledger of the coverage still to restore.

Breaking change: these record fields are gone from the HTTP client's read types and schemas, and from what the CLI prints. Only the four Xcode fields were on records a call returned before this change: RunDestination and WorkspaceDocument have a get and a list. Every other record listed here has no get, list, create or update in macts today, so no call returned it, and only its declared type changes.

- Arc: Window `activeTab` and `activeSpace`.
- Finder: FinderWindow `listViewOptions`, and ListViewOptions `sortColumn`.
- Google Chrome: Window `activeTab`.
- iTerm: Window `currentTab` and `currentSession`, and Tab `currentSession`.
- Mail:
  - Message `mailbox` and `content`;
  - MessageViewer `draftsMailbox`, `inbox`, `junkMailbox`, `outbox`, `sentMailbox` and `trashMailbox`;
  - Mailbox `account` and `container`;
  - Rule `copyMessage` and `moveMessage`.
- Messages: Participant and Chat `account`.
- System Events:
  - the folder fields of ClassicDomainObject, Domain and UserDomainObject;
  - DiskItem `container`;
  - NetworkPreferencesObject `currentLocation`;
  - Service `currentConfiguration` and `interface`;
  - ScriptingClass `superclass`;
  - ScriptingCommand `directParameter`.
- TV: BrowserWindow and PlaylistWindow `view`, and Playlist `parent`.
- Xcode, on records a call returns: RunDestination `device` and `companionDevice` (macts has no get for Device yet), and WorkspaceDocument `lastSchemeActionResult` (no get for SchemeActionResult yet) and `activeRunDestination`. A run destination is identified by its name, and the manifest has no evidence yet that the name is unique. It is also found only within its workspace document, so the field needs its workspace container as well as that evidence.
