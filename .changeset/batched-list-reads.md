---
'@macts/core': patch
---

List operations now read each property once across the collection instead of once per item, so long lists finish much faster: a Reminders list that took over four minutes now takes seconds. Records are assembled by position, and a list fails with an unexpected-value error rather than returning mismatched records if the app reports a different number of values for one property than it has items. A property the app cannot read across the collection is still read item by item, so it is never dropped. Events in one calendar that share an identifier now each report their own details; before, each one repeated the first event's.
