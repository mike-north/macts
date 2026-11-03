---
'@macts/contracts': minor
'@macts/core': minor
'@macts/runtime': minor
---

The macOS provider now converts references at operation inputs and outputs. Contacts `actionTitle`, `performAction` and `shouldEnableAction`, whose `for` takes a single person reference, no longer fail: they accept the reference and pass that person to the app. `actionTitle` still resolves to `undefined` rather than the title, because no manifest records command results yet (#233).

A reference converts when it is a single identity reference with no container, to a resource the app finds at the application by its identifier. An input reference becomes the app's object, found as the resource's `get` finds it. If no object has that identifier, the call fails with `TargetNotFoundError` with `details.resource` set to the referenced resource, before any command is sent, for example: Contacts has no Person matching the reference at `for`. An app object at an output position becomes an identity reference with no container. The output positions that now convert are Microsoft Edge window `activeTab`, Photos album and folder `parent`, and Xcode workspace document `activeScheme` and `activeRunDestination`. Xcode run destination `device` and `companionDevice`, and workspace document `lastSchemeActionResult`, still fail with `InternalError` when they are not null, because those resources have no `get`.

Every other reference still fails with `InternalError`: selectors, identity collections, references with a container, and references to a resource with no identifier, no `get`, a `get` that needs a parent, or no entry in the contract's resource table. The message for a reference changed to: The Contacts operation "performAction" takes a reference at `for` that the macOS provider cannot convert yet.

Breaking change for executor implementers: `ExecutionRequest` and `ResolutionRequest` have a new required field, `resourcePlans`, a `ResourcePlanTable` (in `@macts/contracts`) with each resource's identifier plan. `resourcePlanTable(resources)` derives it from an app contract, and `EMPTY_RESOURCE_PLAN_TABLE` is the table for a caller without a contract. The runtime fills it from the registered contract on every request. `registerContract` now refuses, with `OperationRegistrationError`, a contract whose resource is missing from the manifest or whose identifier type differs from the manifest's primary identifier type.

Nothing reaches the app before the whole input converted: a value that cannot convert, such as a file, a file source, a reference form the provider cannot convert yet, or an invalid value, fails before any event is sent, wherever it sits in the input. Referenced objects are found, and their existence checked, only after that. A call to an app that is not installed fails with `AppUnavailableError` (`not-installed`) whatever its input holds.

The native codec's functions take a third argument, `{ app, references }`, and a native script carries its `references` table. `@macts/core/testing` is a new internal entry for macts' own tests; it is not public API and not covered by semantic versioning.
