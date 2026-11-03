---
'@macts/contracts': minor
'@macts/runtime': minor
'@macts/core': minor
'@macts/sdk': minor
'@macts/api': minor
'@macts/mcp': minor
'@macts/cli': minor
'@macts/automator': minor
'@macts/calendar': minor
'@macts/microsoft-edge': minor
'@macts/microsoft-word': minor
'@macts/notes': minor
'@macts/omnifocus': minor
'@macts/omnigraffle': minor
'@macts/omniplan': minor
'@macts/photos': minor
'@macts/preview': minor
'@macts/reminders': minor
'@macts/script-editor': minor
'@macts/shortcuts': minor
'@macts/system-information': minor
'@macts/terminal': minor
'@macts/textedit': minor
'@macts/xcode': minor
---

List operations return bounded pages

Every list output changed from an array to a page, `{ items, nextCursor? }` (`Page<T>` and `t.page(item)` in `@macts/contracts`). Lists take two optional inputs, `pageSize` and `cursor`. A page holds at most `pageSize` items: 25 by default and at most 100, the same on every transport. A page size of zero, below zero, not an integer or above 100 is rejected, never clamped. When more items remain, the page carries a `nextCursor`; send the same inputs again with it as `cursor` to read the next page. The cursor is opaque. Paging bounds the size and the latency of each call; it does not make a full listing cheaper in total.

A list of a resource that has no identifier takes neither input and returns its whole collection as one page with no `nextCursor`. Resolving a collection reference is not paged: it still returns the full array of records.

Each surface takes the paging inputs from the contract. Generated SDK list methods take a trailing `page` argument (`list(listId, { pageSize, cursor })`) and return `Page<T>`. HTTP and MCP callers send `pageSize` and `cursor` in the input. MCP adds one line after a page's result when more items remain, saying how many items the page holds and how to read more. Generated CLI list commands take `--page-size` and `--cursor` and print how to see the next page. App parameters named `pageSize` or `cursor` on a list operation are now a generation error.

There is a new error, `COLLECTION_CHANGED` (`CollectionChangedError`, HTTP 409, no details). It replaces `UnexpectedValueError` for a collection that changed while it was being read. The same request is correct and can be retried, from the first page if it was paged. A cursor whose item has since moved or been deleted fails this way. A malformed cursor, or one sent to another operation or with other inputs, is a validation error at `cursor`. Audit records and logs record only that a cursor was presented, never its contents.
