---
'@macts/core': minor
---

Manifests can describe two more ways an app finds its objects.

- **Key targeting.** An identifier can set `targeting: byKey`: the app finds an item from the identifier's value through its collection's key form, which the app interprets (for example, a file path). Gets, lookups under a parent, parents found by key and references all use it, and a key that finds nothing fails as a missing target. A `byKey` identifier takes no `runtimeProperty`.
- **Singleton roots.** A resource can record `roots: { <kind>: { property, evidence } }` when the app holds its objects as application properties, one per kind, instead of in a collection. Validation gives the resource a closed enum of its kinds (`<Resource>Kind`), a read-only `kind` property, and a unique primary identifier on `kind` with the new `byRoot` targeting. Its get takes a kind and fails as a missing target when that kind's property holds nothing on this Mac; its list returns one record per kind the app has, skipping the rest. A reference by kind is accepted as input and resolves. An output field holding a reference to a root is left out, with the new `root-kind-unmapped` reason, until a manifest can say which kind the field holds. A root has no create, update or delete, records no parent, and no hierarchy entry names it.

`IdentifierTargeting` gains `'byKey'` and `'byRoot'`. `NativeAddressing` becomes a union of `NativeCollectionAddressing` (whose `lookup` gains `'byKey'`) and the new `NativeRootAddressing`. New exports: `ResourceRootSchema` and `ResourceRootsSchema`, which validate one kind's entry and a resource's whole `roots`, with their `ResourceRoot` and `ResourceRoots` types.
