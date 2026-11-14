# @macts/alfred

## 0.4.0

### Patch Changes

- @macts/contracts@0.4.0

## 0.3.0

### Minor Changes

- dae51a7: Each resource is now spelled the same way on every public surface.

  A resource's segment is the acronym-aware lower camel case of its plural (`MediaItems` → `mediaItems`, `AIMHandles` → `aimHandles`, `URLs` → `urls`). One shared function derives it, and these all use it: routes and operation ids, SDK accessors, MCP tool names, capability names, and the scope segment of derived permissions.

  **Breaking for multi-word resources.** These change:
  - routes and operation ids: `photos.mediaitems.list` becomes `photos.mediaItems.list`
  - SDK accessors: `photos.mediaitems` becomes `photos.mediaItems`
  - MCP tool names: `macts__photos__mediaitems_list` becomes `macts__photos__mediaItems_list`
  - MCP operation names split acronyms as words: `macts__iterm__app_invoke_a_p_i_expression` becomes `macts__iterm__app_invoke_api_expression`, and `macts__mail__app_get_u_r_l` becomes `macts__mail__app_get_url` (5 tools in iTerm, Mail, QuickTime Player and Screen Sharing)
  - derived permissions: for example, `mail:outgoingmessages:send` becomes `mail:outgoingMessages:send`

  A permission granted with the old lowercase scope no longer matches. The permission error suggests the correctly spelled one. Single-word resources are unchanged.

  Explicit manifest permissions that only restated the derived default are removed, so they can't drift from the derivation. Every route's enforced permission is unchanged except where its spelling changes as above.

- a746285: `bindReference` now accepts only resource keys a reference can resolve through, and generated contracts expose their resource table's type.

  Each generated contract exports the type of its resource table as `<App>Resources` (for example `NotesResources`), and the contract is typed `AppContract<<App>Client, <App>Resources>`. The type declares one entry per resource: each builds on `ResourceDescriptor<Record, Id>` and requires the identifier and the literal `get` and `list` operation ids the resource has. The table value is checked against it with `satisfies`, so the type and the value describe one table. `AppContract` takes the table type as an optional second type argument, so `AppContract<Client>` still means a contract whose table keys are not known. Both `createClient` factories return `Client & ClientBrand<Resources>`, and each generated client interface extends `ClientBrand<<App>Resources>` (for example `interface NotesClient extends ClientBrand<NotesResources>`), so the client's type carries the contract's table, including a variable or parameter annotated `NotesClient`. The brand exists only in the type; a client has no added property under any key, and its members are still exactly the app's operations.

  A generated resource table now lists only the resources that have a `get` or a `list` operation. No reference to any other resource can be resolved, in any form or position, so encoding and decoding already rejected them; they now fail as references to a resource the app cannot resolve references through. Their record interfaces are still exported.

  `MactsRuntime.resolveReference` (and so the `/references/v1` route) rejects both kinds of unresolvable target with `ValidationError` (`VALIDATION_FAILED`, 400), with an issue at the reference's `resource`. A reference to a resource absent from the contract's table fails with "The reference names no resource of the app.", the issue saying the app has no such resource. A reference to a resource in the table that has no `get` (for a single reference) or no `list` (for a collection) fails with an issue naming that missing operation. `InvalidSelectionError` is reserved for an index or range the collection cannot satisfy.

  `bindReference(client, data)` reads the table from the client's type. Data type-checks only when every level names a key that records the operation it resolves through: `get` for a single-object reference, a container, and an identity-collection entry, and `list` for a collection. An identity reference needs a resource with an identifier, of the identifier's type. The result is the bound variant for the data's resource, form and cardinality, with the resource's record and identifier types, so `resolve()` returns `Promise<Record>` or `Promise<readonly Record[]>` instead of `unknown`. Where the position takes any container, a container that is itself a reference a client decoded is accepted as it is. At a parent-scoped position, only an identity reference to the parent is accepted. Clients of a contract with no declared table type accept any reference data, as before. `bindReference` behaves as before at runtime. `@macts/contracts` exports the types involved: `ResourceTable`, `ClientBrand`, `ResolvableResourceKey`, `ResolvableReferenceData` (and its object and collection halves), `ResolvableContainment`, `ResourceRecordOf`, `ResourceIdOf`, and `BoundReferenceOf`.

  Generated HTTP clients' list methods return `Page<T>` from `@macts/contracts` instead of an inline `{ items, nextCursor? }` shape, so their items are read-only arrays.

### Patch Changes

- 7429951: Items these apps have no dictionary id for are now looked up by the property that identifies them, instead of by an id that cannot find them.

  A get of a TextEdit, Preview, Script Editor, System Information or Microsoft Word document, or of an OmniGraffle layer, looked the item up with the app's id specifier, using its name as the id. These classes have no id, so that lookup found nothing. A get now finds the item whose name matches. The same applies to Notes accounts, folders and notes, which have an id but are got by name, and to Terminal windows and settings sets, got by name.

  Names are not claimed unique. When two items share the name you ask for, a get returns the first of them in the app's own order. It does not fail as ambiguous. The generated get docs and CLI help now say so.

  Each manifest now declares this targeting on the identifiers it already had, with the dictionary evidence for it. This also covers resources that have no operations yet: Alfred's and Bluetooth File Exchange's application, Word paragraphs, and Xcode file, text and source documents, build settings, devices and build issues. Terminal tabs now declare matching on their tty; where a tab is read from is a separate change, so a tab get is unchanged. No identifier, parameter or operation changes.

  Update these packages together with `@macts/runtime`. A runtime from this release refuses an earlier release of any of these packages as a whole, because its manifest leaves those identifiers without targeting.

- Updated dependencies [c945d04]
- Updated dependencies [127d864]
- Updated dependencies [2a00978]
- Updated dependencies [7429951]
- Updated dependencies [7400f3b]
- Updated dependencies [87985bb]
- Updated dependencies [f9d86f8]
- Updated dependencies [aadc2fe]
- Updated dependencies [99a59fa]
- Updated dependencies [1cfc8fd]
- Updated dependencies [20e7083]
- Updated dependencies [36942f9]
- Updated dependencies [fb9a0a1]
- Updated dependencies [fe1c06c]
- Updated dependencies [f717527]
- Updated dependencies [075e994]
- Updated dependencies [dba9328]
- Updated dependencies [a746285]
- Updated dependencies [762a1ef]
  - @macts/contracts@0.3.0

## 0.2.0

## 0.1.0
