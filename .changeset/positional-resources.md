---
'@macts/contracts': minor
'@macts/core': minor
'@macts/runtime': minor
---

A manifest can now declare a positional resource: one whose objects have no identifier and are found only by their zero-based position within their parent. The resource records `positional: { evidence }`, with curated evidence (`source: curated`, a `note`, `observedAt` and `appVersion`). Nothing is inferred from a missing identifier.

The manifest schema, every generator and both operation registrations refuse the marker on a resource that has a primary identifier, has no get, has a get that records no parent, has a parent the app does not find by its identifier, or has a command that selects one of its items by anything but an `integer` parameter. `@macts/core` exports the rule as `positionalProblems()`, and `isPositional()`.

For a positional resource:

- Its native get, update and delete find the item at `parent[collection].at(index)`, after a bounds check. A position past the end is `InvalidSelectionError`; a missing parent is `TargetNotFoundError` naming the parent.
- An output field holding one, read through its parent's own record, is emitted as an index selector within that parent: `{form: 'selector', cardinality: 'one', selector: {by: 'index', index}, container}`. The index is the position the app's own specifier gives (its final `.at(N)`), never a dictionary `index` property; any other specifier fails as `InternalError`. A command result holding one stays out of output.
- The native executor resolves, and converts at input positions, an index selector to it within its parent's identity container, with the same errors.
- Generated docs say the object has no id, is selected by its zero-based position, and that the position drifts when objects open, close or move.

In `@macts/contracts`, `IndexSelectorReference<T, R>` is a `SelectorReference` whose selector is an index and whose container is an identity reference; it is assignable to `ObjectReference`. `t.indexSelectorReference(scope, resource)` is its value type: its wire schema, and so the runtime's output check, admits only that form. A reference plan gains an optional `form: 'index'`, which records the form the native codec emits.

In `@macts/core`, `NativeAddressing` gains `NativePositionalAddressing` (`lookup: 'byIndex'`), `NativeCodecEnvironment` gains an optional `positionOf`, and a codec failure can carry `outOfRangeResource`. An exhaustive `switch` over `NativeAddressing['lookup']` needs a new case.
