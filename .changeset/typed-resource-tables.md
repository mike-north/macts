---
'@macts/contracts': minor
'@macts/sdk': minor
'@macts/core': minor
'@macts/runtime': minor
'@macts/alfred': minor
'@macts/arc': minor
'@macts/automator': minor
'@macts/bluetooth-file-exchange': minor
'@macts/calendar': minor
'@macts/console': minor
'@macts/contacts': minor
'@macts/finder': minor
'@macts/google-chrome': minor
'@macts/iterm': minor
'@macts/mail': minor
'@macts/messages': minor
'@macts/microsoft-edge': minor
'@macts/microsoft-word': minor
'@macts/music': minor
'@macts/notes': minor
'@macts/omnifocus': minor
'@macts/omnigraffle': minor
'@macts/omniplan': minor
'@macts/photos': minor
'@macts/preview': minor
'@macts/quicktime-player': minor
'@macts/reminders': minor
'@macts/safari': minor
'@macts/screen-sharing': minor
'@macts/script-editor': minor
'@macts/shortcuts': minor
'@macts/spotify': minor
'@macts/system-events': minor
'@macts/system-information': minor
'@macts/system-settings': minor
'@macts/terminal': minor
'@macts/textedit': minor
'@macts/tv': minor
'@macts/xcode': minor
---

`bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

`MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

`bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. A container that is itself a reference a client decoded is accepted as it is. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.
