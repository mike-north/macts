# @macts/sdk

## 0.4.0

### Patch Changes

- Updated dependencies [eb4f199]
- Updated dependencies [ae76d85]
- Updated dependencies [b3f160f]
- Updated dependencies [ae76d85]
- Updated dependencies [76d53b9]
  - @macts/core@0.4.0
  - @macts/runtime@0.4.0
  - @macts/contracts@0.4.0

## 0.3.0

### Minor Changes

- c945d04: Breaking change: list operations return bounded pages.

  Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists whose items have an identifier the manifest claims unique take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size of each call. It bounds the latency of each call only for lists whose pages are read by range, which is most of them: a list read by column costs what its whole collection costs per page (see the entry on how each list reads its pages). Paging does not make a full listing cheaper in total.

  Every other list takes neither input and returns its whole collection as one page with no `nextCursor`: a page is anchored on the identifier of the item before it, which only a unique identifier can do. Uniqueness is opt-in, from evidence: a manifest identifier records `unique: true` (or `unique: false`) with `evidence.unique` saying where the claim comes from, and the capability registry's input schemas show the paging inputs for exactly the lists that page. Contacts lists (people, groups, and a person's emails, phones and addresses) page, because Contacts describes each of those identifiers as unique. Music's playlist list pages. Its track list does not: a playlist can hold the same song more than once, and both entries are expected to share one persistent ID. Calendar event and calendar lists do not page: recurring events share a uid, and calendar names can repeat. `listOperationPages` in `@macts/core` is the one rule every surface uses, and the runtime refuses a contract whose list takes the paging inputs when the manifest says it does not page, or the reverse. Resolving a collection reference is not paged: it still returns the full array of records.

  Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. When more items remain, MCP adds a second text block after the result, saying how many items the page holds and how to read more; the first block is always the JSON result. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

  There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.

- aadc2fe: Some reference inputs now require a container. When the operation that resolves a reference finds objects only within an object of another resource, the reference has to name that parent as its container.
  - Music gets and lists tracks within a playlist.
  - Contacts gets and lists addresses, emails and phones within a person.
  - Calendar gets and lists events within a calendar.
  - Google Chrome and Microsoft Edge get and list tabs within a window.
  - Xcode gets and lists projects, schemes and run destinations within a workspace document.
  - Some apps list resources only within a parent, though each gets a single one without a parent:
    - Reminders lists reminders within a list.
    - Microsoft Edge lists bookmark items within a bookmark folder.
    - OmniGraffle lists graphics, shapes, lines and layers within a canvas.
    - Automator lists actions and variables within a workflow, and an action's settings and required resources within that action.

  The generated resource table records this for each resolving operation, as `parents: { get?, list? }` on the resource. `ResourceDescriptor.parents` (of type `ResourceParents`) in `@macts/contracts` describes it. A reference takes the parent of the operation that resolves it:
  - A single-object reference, a container and an identity-collection entry take the `get` parent.
  - A selector collection (every or range) takes the `list` parent.

  Where a parent applies, the reference's `container` must be an identity reference to it. The following reject a reference with no container, with a container naming another resource, or with a selector container:
  - encoding and decoding;
  - `bindReference`;
  - the runtime's reference check;
  - the published input JSON Schemas.

  Encoding and `bindReference` raise a `ValidationError` at `container` that names the parent. The reference data types reject the same references at compile time. A chain of parents is checked level by level. A container whose parent is name-keyed and not claimed unique (Calendar calendars, Automator workflows, Xcode workspace documents) names the parent by name, so a name others share resolves to the first match the app returns. References resolved through an operation that works at the application are unchanged.

  Behavior change: code that built such a reference without its container now fails to compile and is rejected at runtime. That covers references to a track, address, email, phone or event, and collections of reminders, tabs, graphics and the other listed resources. Add the parent's identity reference as `container`. Contacts' input JSON Schemas grow, because each container branch for an address, email or phone now spells out the person container it requires.

  The macOS provider still does not convert a reference with a container. Passing one to an operation still fails with `InternalError`, and operations still return no references to these resources.

- b8a7587: Create typed clients from an app's contract, remotely or on this Mac, under this Mac's governance

  **`@macts/sdk`** now has two entry points with the same `createClient(app, options)` factory. Each takes an app's contract (app packages expose it at the `/contract` subpath) and returns that app's typed client:
  - **`@macts/sdk`**: `createClient(app, { token, url, fetch? })` runs operations on a macts service over HTTP. Inputs are validated before anything is sent (`ValidationError`), results are validated on the way back (`UnexpectedValueError`), and service errors come back as the same canonical classes a local call throws. Aborts become `OperationCancelledError`, and an unreachable service or unusable response becomes `TransportError`. The token is sent only in the `Authorization` header and never appears in an error. This entry point never loads the Mac-side runtime, so it runs anywhere Node runs.
  - **`@macts/sdk/local`**: `createClient(app, { token, governance?, executor? })` runs operations in process on this Mac, through the same pipeline the service runs: token verification, permission checks, governance, and validation. A contract whose permissions disagree with its manifest is refused on the first call.
  - Both entry points re-export everything from `@macts/contracts` (error classes, value types), so `instanceof` works across them and application code imports only `@macts/sdk`.
  - `resolveClientOptions()` reads `MACTS_API_KEY` and `MACTS_API_URL` and returns `{ token, url }` for `createClient`.
  - Node.js 22.13.0 or later is required.

  **Breaking:** `createMactsClients`, `MactsClients`, the re-exported per-app client types, `resolveConnectionOptions`, and `MactsConnectionOptions` are removed, along with the 35 optional app peer dependencies. `@macts/sdk` no longer fails to import when app packages are missing ([#118](https://github.com/mike-north/macts/issues/118)). Create each app's client from its contract instead, and install the app packages a script uses. `resolveClientOptions()` replaces `resolveConnectionOptions()` and reads the same `MACTS_API_KEY` and `MACTS_API_URL`. Method names, arguments, and results are unchanged:

  ```typescript
  // Before: one map of every app's client, configured from the environment.
  import { createMactsClients } from '@macts/sdk'

  const m = createMactsClients()
  const calendars = await m.calendar.calendars.list()

  // After: one client per app, created from that app's contract.
  import { createClient, resolveClientOptions } from '@macts/sdk'
  import { calendarContract } from '@macts/calendar/contract'

  const calendar = createClient(calendarContract, resolveClientOptions())
  const calendars = await calendar.calendars.list()
  ```

  **`@macts/runtime`** adds `loadHostGovernance()`, the governance this Mac enforces when none is supplied: the policy file and approval provider under `MACTS_HOME`, each key's own policy, and an audit log at `<macts-home>/governance/audit.jsonl` (`getAuditLogPath()`). A missing policy file means the default policy. A malformed or unreadable policy or approval file denies every call that passes the permission check with `InternalError` and never falls back to allowing everything; a caller without the permission is still answered `PermissionDeniedError`. `createRuntime({ governance })` now also accepts a loader such as `loadHostGovernance`, which runs once, on the first call that reaches governance or needs the audit log.

  **Breaking:** `createRuntime` now requires `governance`. Omitting it used to mean an allow-all policy with no audit log; now it is a type error, so a host can never run calls under governance it forgot to supply. Pass `loadHostGovernance` to enforce this Mac's governance, or `{ policy: ALLOW_ALL_POLICY }` to state that nothing is restricted.

  **`@macts/api`**: `createServer`, `createMultiServer`, and `createApp` now enforce `loadHostGovernance()` when no `governance` option is given, instead of an allow-all policy with no audit log. Every governed call is now recorded in the audit log under `MACTS_HOME`. Pass `governance` explicitly to enforce something else.

- fe1c06c: References a client decodes now resolve. Every reference in a result, and every container and identity-collection entry inside it, has a working `resolve(options?)` that hydrates it through the client that decoded it: a single reference resolves to its record, and a collection to an array of records, possibly empty. Resolution is governed as a call of the resource's `get` operation (a single reference) or `list` operation (a collection), under that operation's permission and policy, and references inside the result are bound to the same client.
  - **Remote clients** (`@macts/sdk`) post `{ app, reference }` to `<url>/references/v1/resolve` with the client's API key, and turn every outcome into the same canonical errors an operation call produces.
  - **Local clients** (`@macts/sdk/local`) resolve through their in-process runtime's `resolveReference`, with the same credential and abort signal an operation call uses.

  Callers can also bind a reference they built, and then `resolve()` it. `bindReference(client, data)`, exported from both `@macts/sdk` and `@macts/sdk/local`, binds reference data (an identifier or a selector, such as "the note named Groceries") to a client, so it resolves through that client exactly like a reference the client decoded. It also rebinds a reference bound to another client of the same app, for example a reference a local client returned, handed to a remote client. Binding makes no request. A reference to another app, a malformed field, or a target that the app has no operation to resolve fails with `ValidationError`, and a value that is not a client created by either `createClient` fails with `TypeError`. For a client of a generated contract, its type admits only reference data the contract can resolve, and returns the bound reference for that resource, form and cardinality, typed by the resource's record and identifier.

  What is sent is always the reference re-encoded from its data fields, never wire the client received. A reference from another app, at any level, fails with `ValidationError` before anything is sent. A result that does not match the resolving operation's output contract fails with `UnexpectedValueError`, and so does a resolved identity collection that does not hold exactly one record per entry, so an entry is never silently dropped. A bound reference's own enumerable properties are exactly its data fields, so it can still be passed to any operation that takes a reference.

  `ClientRuntime` in `@macts/contracts` gains a required `resolve(reference, options?)` member, which encodes a reference's data, resolves it, and decodes the result. Custom `ClientRuntime` implementations must add `resolve`; generated contracts and the two client factories already provide it.

  `@macts/contracts` also exports `resolvingOperationKey(cardinality)`, which names the resource-table field (`'get'` or `'list'`) whose operation a reference of that cardinality resolves as.

- a746285: `bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

  Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

  A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

  `MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

  `bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. Where the position takes any container, a container that is itself a reference a client decoded is accepted as it is. At a parent-scoped position, only an identity reference to the parent is accepted. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

  Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.

### Patch Changes

- 075e994: Expose platform-neutral client composition at `@macts/contracts/client` and reuse it from the SDK. Existing SDK factories, value validation, canonical errors, and reference binding retain their behavior and shared identity.
- Updated dependencies [7cb8bc4]
- Updated dependencies [7cb8bc4]
- Updated dependencies [8edbbc2]
- Updated dependencies [361b04c]
- Updated dependencies [89168af]
- Updated dependencies [e569256]
- Updated dependencies [c945d04]
- Updated dependencies [c8dd396]
- Updated dependencies [127d864]
- Updated dependencies [c5a4690]
- Updated dependencies [a18ee4b]
- Updated dependencies [686212a]
- Updated dependencies [7cb8bc4]
- Updated dependencies [9144fc3]
- Updated dependencies [a189125]
- Updated dependencies [2a00978]
- Updated dependencies [7429951]
- Updated dependencies [7429951]
- Updated dependencies [16cda4d]
- Updated dependencies [e0d2969]
- Updated dependencies [2a00978]
- Updated dependencies [2a00978]
- Updated dependencies [62a95dd]
- Updated dependencies [7400f3b]
- Updated dependencies [87985bb]
- Updated dependencies [80fad3c]
- Updated dependencies [915effc]
- Updated dependencies [ee7ba82]
- Updated dependencies [0dd1855]
- Updated dependencies [9ddbb58]
- Updated dependencies [b43d6af]
- Updated dependencies [261a888]
- Updated dependencies [eb51c54]
- Updated dependencies [3885b38]
- Updated dependencies [7ac69f1]
- Updated dependencies [f9d86f8]
- Updated dependencies [ed3bf17]
- Updated dependencies [c4717eb]
- Updated dependencies [862bf2d]
- Updated dependencies [e2c7efc]
- Updated dependencies [7aed949]
- Updated dependencies [ead44ad]
- Updated dependencies [bd34a91]
- Updated dependencies [aadc2fe]
- Updated dependencies [8c4faef]
- Updated dependencies [99a59fa]
- Updated dependencies [1cfc8fd]
- Updated dependencies [e319917]
- Updated dependencies [20e7083]
- Updated dependencies [36942f9]
- Updated dependencies [5033b73]
- Updated dependencies [e796f6b]
- Updated dependencies [d393e28]
- Updated dependencies [3463be6]
- Updated dependencies [e6214e2]
- Updated dependencies [dae51a7]
- Updated dependencies [8edbbc2]
- Updated dependencies [5f49d6f]
- Updated dependencies [62f30ba]
- Updated dependencies [fb9a0a1]
- Updated dependencies [b8a7587]
- Updated dependencies [fe1c06c]
- Updated dependencies [f717527]
- Updated dependencies [075e994]
- Updated dependencies [832e1ad]
- Updated dependencies [5869dfc]
- Updated dependencies [dba9328]
- Updated dependencies [a746285]
- Updated dependencies [b49af54]
- Updated dependencies [62a95dd]
- Updated dependencies [762a1ef]
  - @macts/core@0.3.0
  - @macts/runtime@0.3.0
  - @macts/contracts@0.3.0

## 0.2.0

## 0.1.0

### Minor Changes

- ced442a: Add `@macts/sdk` — frictionless authoring helper for governed macts scripts.

  `createMactsClients()` resolves `MACTS_API_KEY` and `MACTS_API_URL` once from
  the environment and returns a fully-typed client map for every installed
  `@macts/<app>` SDK, so a composed script contains only the composition logic:

  ```typescript
  import { createMactsClients } from '@macts/sdk'

  const m = createMactsClients()
  const calendars = await m.calendar.calendars.list()
  const lists = await m.reminders.lists.list()
  await m.reminders.reminders.create({
    name: `Review: ${calendars[0]?.name ?? 'calendar'}`,
    listId: lists[0]?.id ?? '',
  })
  ```

  Client property names match the app-prefix of dotted capability names returned
  by `macts capabilities search`, making "find a capability → compose it" a
  direct mapping. Governance is inherited automatically — every call routes
  through the governed API and a policy-denied operation surfaces as an error
  thrown by the client method.
