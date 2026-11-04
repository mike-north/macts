---
'@macts/core': minor
'@macts/runtime': minor
---

A get, update or delete now selects its item only by a parameter its manifest command declares.

The item's identifier is the command's first required parameter other than its parent's (`itemIdentifierParameter` in `@macts/core`). This applies to a resource-scoped get, update or delete, and to a delete at application scope. No generated interface, CLI command or native body supplies an `id` parameter the manifest does not declare. `resolveIdParams` now throws, naming the command, when there is no such parameter, where it used to return `id`.

Generation refuses a manifest with a command that must select an item and declares no identifier parameter. `generateConsolidatedPackages`, `generateClientPackage`, `generateServerPackage`, `generateHttpClientSdk`, `generateCliPlugin` and `generateSdk` return one error for each such command and no files. Each error names the app and the command key and says to declare the item's identifier as a required parameter. `unselectableItemCommands` and `itemSelectionProblem` in `@macts/core` report the same commands.

Registration refuses the same commands. `operationsFromManifest` (`registerManifest`) now also refuses an application-scoped delete that declares no identifier parameter. `operationsFromContract` (`registerContract`) now runs the same check against the manifest, whichever operations the contract covers. Both throw `OperationRegistrationError` naming the app and the command, and register nothing from the app.

An application-scoped get or update is a plain command call and selects no item, so the rule does not reach it. If a manifest of yours is refused, declare the item's identifier as a required parameter of the command named in the error.
