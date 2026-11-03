---
'@macts/core': minor
'@macts/runtime': minor
'@macts/contracts': minor
'@macts/cli': patch
---

The runtime resolves references. `MactsRuntime.resolveReference(app, reference, context)` takes a reference in wire form (the `{"reference": …}` control record) and resolves it as a call of the referenced resource's `get` operation (a single reference) or `list` operation (a collection reference). It needs that operation's permission, is governed, approved, and audited exactly like a direct call of it, validates the reference against the app contract's resource table, and validates the result against the operation's output contract. A container's permission is not required, because containers only locate the target. A reference to a resource absent from the contract's resource table fails with `ValidationError` ("The reference names no resource of the app."), and so does one whose resource has no such operation, with an issue at the reference's `resource` naming the missing operation. `InvalidSelectionError` is for an index or range the collection cannot satisfy. An app now has at most one registered contract, and `registerContract` refuses a second contract for the same app. `registerContract` also refuses a contract whose resource table records a `get` or `list` operation that is not one of its operations targeting that resource. For an identity collection, the result must hold exactly one record per entry, so an entry is never silently dropped.

The `Executor` interface in `@macts/core` gains a required `resolve(request: ResolutionRequest)` method, which resolves a validated reference into the record or records it denotes. Custom executors must implement it. To migrate, add a `resolve` method; one that does not support references can return a rejected promise with `InternalError`, as the native macOS executor does.

`TargetNotFoundError` details in `@macts/contracts` can carry `entryIndex`, the zero-based position of the identity-collection entry whose target no longer exists.

`@macts/cli`: the host's built-in test executor implements the new `resolve` method.
