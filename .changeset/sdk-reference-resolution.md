---
'@macts/sdk': minor
'@macts/contracts': minor
---

References a client decodes now resolve. Every reference in a result, and every container and identity-collection entry inside it, has a working `resolve(options?)` that hydrates it through the client that decoded it: a single reference resolves to its record, and a collection to an array of records, possibly empty. Resolution is governed as a call of the resource's `get` operation (a single reference) or `list` operation (a collection), under that operation's permission and policy, and references inside the result are bound to the same client.

- **Remote clients** (`@macts/sdk`) post `{ app, reference }` to `<url>/references/v1/resolve` with the client's API key, and turn every outcome into the same canonical errors an operation call produces.
- **Local clients** (`@macts/sdk/local`) resolve through their in-process runtime's `resolveReference`, with the same credential and abort signal an operation call uses.

Callers can also bind a reference they built, and then `resolve()` it. `bindReference(client, data)`, exported from both `@macts/sdk` and `@macts/sdk/local`, binds reference data (an identifier or a selector, such as "the note named Groceries") to a client, so it resolves through that client exactly like a reference the client decoded. It also rebinds a reference bound to another client of the same app, for example a reference a local client returned, handed to a remote client. Binding makes no request. A reference to another app, a malformed field, or a target that the app has no operation to resolve fails with `ValidationError`, and a value that is not a client created by either `createClient` fails with `TypeError`. For a client of a generated contract, its type admits only reference data the contract can resolve, and returns the bound reference for that resource, form and cardinality, typed by the resource's record and identifier.

What is sent is always the reference re-encoded from its data fields, never wire the client received. A reference from another app, at any level, fails with `ValidationError` before anything is sent. A result that does not match the resolving operation's output contract fails with `UnexpectedValueError`, and so does a resolved identity collection that does not hold exactly one record per entry, so an entry is never silently dropped. A bound reference's own enumerable properties are exactly its data fields, so it can still be passed to any operation that takes a reference.

`ClientRuntime` in `@macts/contracts` gains a required `resolve(reference, options?)` member, which encodes a reference's data, resolves it, and decodes the result. Custom `ClientRuntime` implementations must add `resolve`; generated contracts and the two client factories already provide it.

`@macts/contracts` also exports `resolvingOperationKey(cardinality)`, which names the resource-table field (`'get'` or `'list'`) whose operation a reference of that cardinality resolves as.
