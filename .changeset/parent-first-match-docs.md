---
'@macts/core': patch
'@macts/automator': patch
'@macts/calendar': patch
'@macts/xcode': patch
---

Generated docs now say which parent an operation uses when several parents share the value it looks the parent up by.

A list, get, create, update or delete under a parent looks the parent up by the parent's own identifier. When that identifier is matched on a property (`byProperty`) that is not claimed unique, these docs add one sentence:

- the generated HTTP client's docs for those operations;
- the contract client's docs for them;
- the CLI's list, get and create help.

For example: "When several calendars share the same name, the first match in the app's order is used as the calendar." When the item is matched the same way, this sentence comes after the item's own first-match sentence.

Nothing is added for a parent claimed unique, for a parent looked up by the app's id or key specifier, or for an operation with no parent.

This adds the sentence to:

- Calendar events, under a calendar;
- Automator actions and variables, under a workflow;
- Xcode projects, schemes and run destinations, under a workspace document.

No operation, input or capability changes.
