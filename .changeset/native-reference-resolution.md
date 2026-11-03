---
'@macts/core': minor
---

The macOS provider now resolves references. A single identity reference with no container, to a resource the app finds by its identifier alone, resolves to that object's record, the same record the resource's `get` returns. An identity collection of such references resolves to one record per entry, in entry order, and to `[]` when it has no entries, without starting an automation process; permission, governance, approval and audit still apply to it. With the local SDK, `resolve()` on such a reference, for example a Contacts person or a Reminders list, now returns the record instead of failing.

The object is found the same way an operation finds a reference it takes as input. A missing object fails with `TargetNotFoundError` with `details.resource` set to the referenced resource, for example: Contacts has no Person matching the reference. In an identity collection, `details.entryIndex` is the position of the first missing entry, and nothing is read. A record that does not match the resource's record type fails with `UnexpectedValueError`.

Other forms still fail with `InternalError`, before anything is sent to the app: selectors, references and identity-collection entries with a container, and references to a resource that has no identifier, is found only within a container, or has no entry in the contract's resource table. The message names the form, for example: The macOS provider cannot resolve a selector reference to the Contacts resource "Person" yet.

`@macts/core/testing`, the internal entry for macts' own tests, adds `standInTransport` and `nativeReadKeys`. It is not public API and not covered by semantic versioning.
