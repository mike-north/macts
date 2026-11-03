---
'@macts/contracts': minor
'@macts/core': minor
'@macts/arc': minor
'@macts/contacts': minor
'@macts/finder': minor
'@macts/google-chrome': minor
'@macts/iterm': minor
'@macts/mail': minor
'@macts/mcp': minor
'@macts/messages': minor
'@macts/microsoft-edge': minor
'@macts/music': minor
'@macts/photos': minor
'@macts/system-events': minor
'@macts/tv': minor
'@macts/xcode': minor
---

A reference now names the app it belongs to. Every reference data and bound form (`IdentityReferenceData`, `SelectorReferenceData`, `IdentityCollectionReferenceData`, `SelectorCollectionReferenceData`, and the bound `ObjectReference` and `CollectionReference` types) has a required `app` field: the `app` of the contract it is used with. Containers and identity-collection entries carry it too.

- **Decoding** sets `app` from the contract at every level.
- **Encoding** rejects a reference whose `app` is missing or names another app, at any level. The issue is at `[...path, 'app']`, so a reference from one app cannot be passed to another app's operation; the call fails with a validation error before anything is sent.
- **The wire form is unchanged.** It never carries `app`, because the route already names the app. A wire reference that carries `app` is rejected.

`t.reference` now takes a scope instead of a resource table: `t.reference(() => scope, resource, cardinality)`, where the new `ReferenceScope` type is `{ app, resources }`. An app contract is assignable to `ReferenceScope`, and generated contracts pass `() => <app>Contract`. Code that builds references by hand must add `app`, and code that calls `t.reference` with a resource table must pass a scope instead.

Reference types now carry their resource key as a literal type. The data types (`IdentityReferenceData`, `SelectorReferenceData`, `IdentityCollectionReferenceData`, `SelectorCollectionReferenceData`, `ObjectReferenceData`, `CollectionReferenceData`) and the bound types (`ObjectReference`, `CollectionReference`, `IdentityReference`, `SelectorReference`, `IdentityCollectionReference`, `SelectorCollectionReference`, `ObjectReferenceVariant`, `CollectionReferenceVariant`) each take a final type parameter for it, which defaults to `string`. `t.reference` infers it from its `resource` argument.

Generated contracts type references by direction:

- Record fields and command results hold a bound reference, `ObjectReferenceVariant<Record, Id, 'Key'>`.
- Parameters and create and update fields take its data form, `ObjectReferenceData<Id, 'Key'>`. Callers can pass a reference they build, by identifier or by selector, or one they received.

A reference to another resource, or of the other cardinality, no longer type-checks.

A reference must now name objects that can be resolved, at every level:

- A single reference, every container, and every identity-collection entry need a resource with a `get` operation.
- A collection needs a resource with `list`.

`ReferenceRegistry` entries record `get` and `list` for this, and an app contract's `resources` table already has them. The rule is part of the reference wire schema, so it applies everywhere: to encoding, decoding, the runtime's check of raw HTTP and MCP requests, and the JSON Schema of every reference position. That JSON Schema now lists only the resources that can contain a reference, and a position whose resource lacks its operation admits no value (`{"not": {}}`). A violation is reported at the reference itself, or at the `resource` of the offending container or entry.

`ResourceDescriptor.id` now documents the meaning of an identity reference to a resource keyed by name. It resolves to whichever object has that name when it is resolved. When several objects share the name, the app decides which one that is.

Generated surfaces never offer an operation that cannot be called. An input position that takes a single reference to a resource with no `get` admits no value, so the rule above rejects every request that fills it. An optional position like that is left out of the input. A required one makes the operation unavailable:

- generation warns, naming the app, the operation and the position;
- the descriptor stays, with a new `unavailable` member (`OperationUnavailability`: the positions and the reason), and the SDK method's documentation says so;
- the MCP adapter lists no tool for it, and calling its tool name is an unknown-tool call;
- the generated CLI has no command for it, and capability discovery lists no capability for it.

None of the affected positions ever worked through the native runtime, because it cannot yet encode references. What changes is how a request that uses them is treated. A request that sends a left-out field used to reach the server, and is now rejected as an unknown field. An unavailable operation is no longer offered as a tool, a command or a capability, and a raw request to it is still rejected by its input schema.

Operations that become unavailable:

- Contacts `contacts.app.actionTitle`, `contacts.app.performAction` and `contacts.app.shouldEnableAction`: their required `for` takes a person, and Contacts has no operation that gets one. The CLI commands `macts contacts action-title`, `perform-action` and `should-enable-action` are removed.
- Mail `mail.app.synchronize`: its required `with` takes an account, and Mail has no operation that gets one. The CLI command `macts mail synchronize` is removed.

Operations that lose an optional position:

- Mail `mail.app.checkForNewMail` loses `for` (an account). The SDK method is now `checkForNewMail(options?)`, and the CLI flag `--for` is removed.
- Mail `mail.app.performMailActionWithMessages` loses `inMailboxes` (a mailbox) and `forRule` (a rule). The SDK method is now `performMailActionWithMessages(options?)`, and the CLI flags `--in-mailboxes` and `--for-rule` are removed.

Create and update input types that no operation takes lose the same kind of field. The types change, but no request does:

- Finder `ListViewOptionsCreateInput` and `ListViewOptionsUpdateInput` lose `sortColumn`.
- iTerm `WindowCreateInput` and `WindowUpdateInput` lose `currentTab` and `currentSession`, and `TabCreateInput` and `TabUpdateInput` lose `currentSession`.
- Mail `MessageCreateInput` and `MessageUpdateInput` lose `mailbox`, and `RuleCreateInput` and `RuleUpdateInput` lose `copyMessage` and `moveMessage`.
- Music and TV `BrowserWindowCreateInput` and `BrowserWindowUpdateInput` lose `view`, and become `Record<string, never>`.
- System Events `NetworkPreferencesObjectCreateInput` and `NetworkPreferencesObjectUpdateInput` lose `currentLocation`, and become `Record<string, never>`. `ServiceCreateInput` and `ServiceUpdateInput` lose `currentConfiguration`.

`CliGeneratorContext` gains `isOperationAvailable` and `omittedInputs`, which the CLI generator uses to apply the rule.
