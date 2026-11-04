---
'@macts/core': minor
'@macts/google-chrome': minor
'@macts/microsoft-edge': minor
---

References to objects an app holds only inside another object now carry that object as their container, and the macOS provider reads and resolves them.

Google Chrome and Microsoft Edge: a window's `activeTab` is back in window records, from `windows.get`, `windows.list` and Edge's `windows.create`. It is a reference to the tab that carries the window it was read from as its container, for example `{ resource: 'Tab', id: '…', container: { resource: 'Window', id: '…' } }`. Chrome and Edge hold each tab in its window, so a tab is identified only within its window, and `activeTab.resolve()` finds the window first, then the tab in it. A window or tab id identifies it while the browser keeps running; it is not promised to stay the same after the browser quits and opens again. The Edge behavior follows Edge's scripting dictionary and has not been verified on an installed Edge.

`@macts/core`:

- The macOS provider now converts and resolves a reference whose target is found within a container: it finds the container first, then the target within it. If the container is missing, the call fails with `TargetNotFoundError` whose `details.resource` names the container's resource (for example `Window`), and the target is not looked up. If the container does not hold the target, it fails with `TargetNotFoundError` naming the target's resource. A container on an object found at the app level, or a container of another resource, still fails with `InternalError`.
- This also covers Contacts email addresses, phone numbers and addresses within their person, Music tracks within their playlist and Calendar events within their calendar, at inputs and on resolution. These have not yet been checked against the live apps.
- An output field holding such a reference is now kept when it is read from its container's own record and the container is identified by an id, or by a name claimed unique with evidence. Other such fields stay left out, as before: Xcode workspace document `activeScheme` and `activeRunDestination`, a target's `project`, and TV window and playlist references.
- `NativeAddressing` gains `within`, the resource an object is found within, and `NativeBodyOptions` gains `containerReferences`.
