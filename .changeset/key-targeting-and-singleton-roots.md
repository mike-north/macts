---
'@macts/core': minor
---

Manifests can describe two more ways an app finds its objects.

- **Key targeting.** An identifier can set `targeting: byKey`: the app finds an item from the identifier's value through its collection's key, which the app interprets (for example, a file path). Gets, lookups under a parent, parents found by key and references all use it, and a key that finds nothing fails as a missing target. A `byKey` identifier takes no `runtimeProperty`.
- **Singleton roots.** A resource can record `root: { property, evidence }` when the app holds its one object as an application property instead of in a collection. Its get takes no identifier on any surface: the contract operation has an empty input, the client `get()` takes only call options, and the CLI command sits at the property's name with no argument. A root has no list, records no parent, declares no identifier, and no hierarchy entry names it. No reference can name a root yet, so an output field holding one is left out with the new `singleton-root` reason, and an operation whose required input takes one cannot be called.

`IdentifierTargeting` gains `'byKey'`, and `NativeAddressing.lookup` gains `'byKey'`. Generation messages for a position that takes a reference to a root say why no value can be given.
