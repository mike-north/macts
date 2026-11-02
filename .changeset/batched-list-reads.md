---
'@macts/core': patch
---

List operations now read each property once across the collection instead of once per item, so long lists finish much faster: a Reminders list that took over four minutes now takes seconds. Records are assembled by position. After reading the properties, a list reads the identifiers once more and checks that no item was added, removed or moved meanwhile; if the collection changed, it reads again from the start, and if it changes again it fails with an unexpected-value error rather than returning records that pair values from different items. A resource with no identifier is counted again instead, which catches items added or removed but not items that swap places. A property the app cannot read across the collection is still read item by item, so it is never dropped. Events in one calendar that share an identifier now each report their own details; before, each one repeated the first event's.

Behavior change: Script Editor's document list now reads `contents` across the collection, like every other property, instead of taking it from each document's property record. A document whose record left `contents` out now includes it.
