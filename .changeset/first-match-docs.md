---
'@macts/core': patch
'@macts/contracts': patch
'@macts/calendar': patch
'@macts/music': patch
---

Generated docs now say which item a get, update or delete acts on when several items share the value it looks the item up by.

When a resource is matched on a property (`byProperty`) that is not claimed unique, the generated HTTP client's get, update and delete docs, the contract client's, and the CLI get's help add one sentence: when several items share the value, the first match in the app's order is used, and the operation does not fail as ambiguous. Nothing is added for a value claimed unique, or for a resource looked up by the app's id or key specifier.

This adds the sentence to Calendar calendars and Music tracks. It also reaches Automator workflows, Xcode workspace documents and run destinations, and the documents, layers, Notes items and Terminal windows, settings sets and tabs that are now matched by name or tty. No operation, input or capability changes.

`ResourceDescriptor.id` now says that an identity reference to a resource matched on a property resolves to the first match in the app's order when several objects share the value, and that a key is interpreted by the app.
