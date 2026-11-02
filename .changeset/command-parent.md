---
'@macts/core': minor
'@macts/automator': minor
'@macts/automator-server': minor
'@macts/calendar': minor
'@macts/calendar-server': minor
'@macts/microsoft-edge': minor
'@macts/microsoft-edge-server': minor
'@macts/omnigraffle': minor
'@macts/omnigraffle-server': minor
'@macts/reminders': minor
'@macts/reminders-server': minor
'@macts/xcode': minor
'@macts/xcode-server': minor
---

A command on a nested resource now names its parent in the manifest instead of having it guessed

A manifest command records `parent: { resource, parameter }`: the resource whose items hold the command's target, and the command's required parameter that carries the parent's identifier. The manifest schema rejects a parent resource the manifest does not declare or marks unsupported, and a parameter that is not one of the command's required parameters. Every operation takes its parent from this record. A command that records no parent addresses its resource at the application. Nothing infers a parent from a parameter's name or position any more.

These operations now reach the right collection, where before they addressed one their app does not have:

- Microsoft Edge: `bookmarkItems.list`, under a bookmark folder.
- Xcode: `projects.list`, `schemes.list` and `runDestinations.list`, under a workspace document.
- Automator: `automatorActions.list` and `variables.list`, under a workflow; `settings.list` and `requiredResources.list`, under an action.

Calendar events, Microsoft Edge tabs, OmniGraffle graphics, shapes, lines and layers, and Reminders reminders record the parent they already used, so they behave as before. The generated SDK, CLI and tool signatures are unchanged; each app's embedded manifest now carries the recorded parents.
