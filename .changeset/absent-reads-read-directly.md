---
'@macts/core': patch
---

A property whose evidence makes the app's "no such object" failure (-1728) its empty value now reads as `null` when the app reports its object missing only as the object is read for the reference, not only when the property read itself fails. This holds wherever the value came from: an item's property record, a column read across a list, or a read on its own. Before, a get or a list could fail as if the item itself were missing. Such a property is also always read on its own in a get, never taken from the item's property record, because its evidence is of what that read reports.

The body marks such a value for the codec with a registry symbol, which no app record or JSON value can carry, so app data is never taken for the marker. A body marks values only for a result encoded by a typed plan: `NativeBodyOptions.absentValueMarkers` (default `true`) turns marking off, and the native executor turns it off under a passthrough plan, whose result the codec returns unchanged.
