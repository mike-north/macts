---
'@macts/core': patch
'@macts/runtime': patch
---

An identifier other than the class's dictionary id must now declare how it is looked up.

An identifier with no `targeting` is looked up with the app's id specifier (`byId`). That finds an item only by the class's dictionary id, the property the app's scripting dictionary declares with code `ID  `, whatever the property is named. Calendar's event `uid` carries that code and keeps the default. Any other identifier, such as a document's `name`, must declare its targeting, whether or not the class also has an `id`: usually `byProperty` or `byKey`. An explicit `byId` is accepted as the manifest's own claim that the app's id specifier finds the item by that property. A property with no code never qualifies. The rule judges the resource's primary identifier with what it inherits from its superclasses.

Generation refuses a manifest with such an identifier. `generateConsolidatedPackages`, `generateClientPackage`, `generateServerPackage`, `generateHttpClientSdk`, `generateCliPlugin` and `generateSdk` return one error for each such resource and no files, and `generateCapabilitiesModule` throws with the same errors. Each error names the app, the resource and the identifier property, and says to declare its targeting. `untargetedIdentifiers` and `identifierTargetingProblem` in `@macts/core` report the same resources.

Registration refuses the same manifests. `operationsFromManifest` (`registerManifest`) and `operationsFromContract` (`registerContract`) throw `OperationRegistrationError` naming the app, the resource and the property, and register nothing from the app.

If a manifest of yours is refused, add `targeting: byProperty` to the identifier the error names, to match items on that property, or `targeting: byKey` if the app looks items up by that value as a key.
