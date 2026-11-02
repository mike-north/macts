---
'@macts/contracts': minor
'@macts/core': minor
'@macts/arc': minor
'@macts/contacts': minor
'@macts/finder': minor
'@macts/google-chrome': minor
'@macts/iterm': minor
'@macts/mail': minor
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

Encoding a reference now requires that it can be resolved, and reports a validation issue if it cannot:

- A single reference needs a resource with a `get` operation.
- A collection needs a resource with `list`.
- Every container needs a resource with `get`.

`ReferenceRegistry` entries record `get` and `list` for this, and an app contract's `resources` table already has them. Decoding does not apply this check, so every reference an operation returns is still bound.

`ResourceDescriptor.id` now documents the meaning of an identity reference to a resource keyed by name. It resolves to whichever object has that name when it is resolved. When several objects share the name, the app decides which one that is.
