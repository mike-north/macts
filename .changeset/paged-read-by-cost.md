---
'@macts/core': patch
'@macts/contacts': patch
'@macts/notes': patch
'@macts/photos': patch
'@macts/reminders': patch
'@macts/shortcuts': patch
---

Contacts lists are fast again. A page of people took about a second per person, so a page of 25 took 15 to 20 seconds and could hit the 30 second limit. It now takes about as long as listing every person, under 2 seconds for 295 people.

Contacts reads a page's worth of people one person at a time, but reads a value for every person at once. Reminders is the opposite. So each list that pages now reads its pages in one of two ways, chosen from live measurement of both for its app:

- by range: each value is read for the page's items only;
- by column: each value is read for the whole collection, then cut to the page.

Both ways return the same page, cursor and `COLLECTION_CHANGED` error. Range is the default, because a page read by range costs what the page holds however large the collection grows. A list reads by column only when that was measured clearly faster, taking at most three quarters of the time. Contacts people, Notes attachments, Photos albums and Reminders lists are read by column. Every other list that pages is read by range.

A page read by column costs what the whole collection costs, so it gets slower as the collection grows.

A manifest's `rangeRead` marker with `supported: true` now requires `read: range` or `read: column`. Its evidence also requires `cost`, what a page cost, as its own observation:

- `observedAt`, when the page was timed;
- `pageMs` and `columnMs`, the time of the first page read each way, in milliseconds;
- `items`, the collection size they were measured at;
- `runs`, how many times the page was read each way, each time being the median of those runs;
- `pageSize`, the size of the page timed.

All six are required, and a `rangeRead` marker with `supported: false` records no `read` and no `cost`. `read` must be `column` exactly when `columnMs` is at most 0.75 × `pageMs`, and `range` otherwise. `PAGE_READS`, the `PageRead` type and `pageReadFor`, which applies that rule, are exported from `@macts/core`.
