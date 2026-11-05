---
'@macts/core': minor
'@macts/runtime': minor
---

A resource command now sends the app the item you name. Commands such as `show`, `build`, `send` or `save` are now sent their item as the command's direct parameter.

Each of these commands acts on one item, and the app's command takes that item as its direct parameter. The generated native body used to call the command on the application with only its declared parameters, so the app never received the item. Depending on the app, the call failed or acted on an item the app picked, such as the front document.

The body now selects the item exactly as a get does, through the same lookup, under the parent the command records, by the resource's identifier targeting. A missing parent or item fails with `TargetNotFoundError` naming its resource, before the command is sent. The item is then sent as the direct parameter. Only the command's other declared parameters are sent as named parameters; the item's and the parent's identifiers never are.

The rule that selects an item now covers every resource-scoped command except a list or create. The item's identifier is the command's first required parameter other than its parent's. The generated contract client, HTTP client and CLI take a resource command's inputs in the same order as a get's: the parent's identifier, then the item's, then the command's other parameters. The generated CLI command now asks only for those inputs, as follows:

- a flag for the parent, when the command records one;
- one positional for the item, labelled with the identifier a get takes;
- a flag for each other parameter.

It no longer asks for a positional it never used, for parent flags taken from the resource's place in the hierarchy, or for the identifier a second time as a flag. When the resource is matched on a name that is not claimed unique, the generated docs and CLI help say the first match is used.

A few shipped commands cannot select their item yet, because their resource has no identifier or get, or because their item lies more than one parent deep and a command records only one parent: OmniPlan `fix`, Music and TV `refresh`, System Events `click`, `perform` and `select`, and Mail `forward`, `redirect` and `reply`. `@macts/core` lists them in `KNOWN_ITEM_SELECTION_GAPS`, each with what it still needs. They stay available and behave as before, and their generated docs say so: "macts does not yet send the <item> to the app, so the app acts on whatever it chooses." Generation and registration refuse any other command that cannot select its item.

Generation and registration now refuse a resource command that declares no identifier parameter, as they already refused such a get, update or delete. Each refusal names the app and the command key and says to declare the item's identifier as a required parameter. If a manifest of yours is refused, declare it, together with the command's `parent` where the resource's get records one.

Refs #287
