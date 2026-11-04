---
'@macts/runtime': minor
'@macts/api': minor
'@macts/system-events': minor
'@macts/system-events-server': minor
---

Manifest-registered operations now reject input keys that are not declared parameters, as contract-registered operations already do.

An operation registered with `registerManifest` (in `@macts/api`, every app passed to `createApp` as a manifest) accepts exactly its command's declared parameters. A call with any other key fails input validation with `VALIDATION_FAILED` (HTTP 400), with one issue at the input itself. As for any input that fails validation after the permission check, the call writes one `invalid-input` audit record, is not evaluated by policy, is never put to an approver, and does not run. Clients that sent extra keys to a manifest-served operation now receive this validation error; send only the operation's declared parameters.

A resource-scoped get, update or delete whose manifest command declares no identifier parameter (no required parameter other than its parent's) is rejected at registration: `registerManifest` throws `OperationRegistrationError` naming the app and the command, and registers nothing from the app. Such a get or update could not be called once undeclared keys are rejected, and such a delete selects no item: it calls the app's delete with no target.

Breaking change in `@macts/system-events`: the `diskItems.delete` operation (`system-events.diskItems.delete`) is removed, because it did not target the disk item it named. It took an `id` but called System Events' delete with no target. The contract client's `diskItems.delete(id)`, the HTTP client's `DiskItemResourceClient` and `SystemEventsClient.diskItems`, and the capability entry are gone, and the System Events manifest no longer declares the command. A delete that targets one disk item will be added once disk items can be selected by an identifier. No other shipped command is affected.

A list registered from a manifest does not page, so it does not accept `pageSize` or `cursor`. Lists registered from a contract page as before.

`buildCommandSchema` and `buildSchemaRegistry` are unchanged and still let undeclared keys through; the runtime no longer validates operation input with them.
