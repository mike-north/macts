---
'@macts/contracts': minor
'@macts/sdk': minor
'@macts/core': minor
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

Each generated contract keeps the literal type of its resource table and exports it as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`: the client's type carries the contract's table. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

`bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. A container that is itself a reference a client decoded is accepted as it is. Clients of a contract with no declared table type accept any reference data, as before. Runtime behavior is unchanged. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`. A `ReferenceRegistry` entry may also carry the resource's `name`, as a contract's table entries do, so a table typed by its literal entries is still a registry.

Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.
