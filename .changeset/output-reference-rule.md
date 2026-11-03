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

Generated contracts do not declare an output field holding a reference that no caller could use (#219). A field is left out when it references:

- a resource the app has no operation to get;
- a resource with no identifier, which therefore has no identity reference;
- a resource the app gets only within its container. A reference read from the app carries no container, so it could not be resolved;
- or a resource identified by its name, when the manifest does not claim that name unique. Such a reference resolves to whichever object has that name, which may not be the one the app returned. A primary identifier claimed `unique: true`, with its evidence, counts as identity.

A field left out is not declared by the contract's record type or value type, and native reads do not read it. It is also gone from the HTTP client's read type and schema and from what the CLI prints. Input types are unchanged, so a writable field may still be set. Generation warns once per field left out. The warning names the app, the field, the referenced resource and the reason. The same rule applies to a command result, but no manifest records one yet.

Breaking change: these record fields are gone from the HTTP client's read types and schemas, and from what the CLI prints:

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
- Xcode: RunDestination `device` and `companionDevice`, and WorkspaceDocument `lastSchemeActionResult` and `activeRunDestination`. A run destination is identified by its name, which is not claimed unique.

Each field comes back once its resource gains a `get` that does not need a container, or a unique claim for its name with evidence.
