---
'@macts/contracts': minor
'@macts/core': minor
'@macts/runtime': minor
---

The macOS provider now converts references at operation inputs and outputs, so Contacts `actionTitle`, `performAction` and `shouldEnableAction` work. Their `for` takes a single person reference, and the app now receives that person.

A reference converts when it is a single identity reference with no container, to a resource the app finds at the application by its identifier. An input reference becomes the app's object, found as the resource's `get` finds it. If no object has that identifier, the call fails with `TargetNotFoundError` with `details.resource` set to the referenced resource, before any command is sent, for example: Contacts has no Person matching the reference at `for`. An app object at an output position becomes an identity reference with no container, so the reference fields of Microsoft Edge windows, Photos albums and folders, and Xcode workspace documents and run destinations are now read where their target has an identifier and a `get`.

Every other reference still fails with `InternalError`: selectors, identity collections, references with a container, and references to a resource with no identifier, no `get`, or a `get` that needs a parent. The message for a reference changed to: The Contacts operation "performAction" takes a reference at `for` that the macOS provider cannot convert yet.

Breaking change for executor implementers: `ExecutionRequest` and `ResolutionRequest` have a new required field, `resourcePlans`, a `ResourcePlanTable` (in `@macts/contracts`) with each resource's identifier plan. `resourcePlanTable(resources)` derives it from an app contract, and `EMPTY_RESOURCE_PLAN_TABLE` is the table for a caller without a contract. The runtime fills it from the registered contract on every request. `registerContract` now refuses, with `OperationRegistrationError`, a contract whose resource is missing from the manifest or whose identifier type differs from the manifest's primary identifier type.

`@macts/core` exports `composeNativeScript` and `parseNativeOutcome`, so a native transport that runs scripts in a host of its own composes them and reads their output as the built-in one does. The native codec's functions take a third argument, `{ app, references }`, and a native script carries its `references` table.
