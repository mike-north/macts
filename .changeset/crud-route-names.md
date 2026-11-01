---
'@macts/automator': minor
'@macts/automator-server': minor
'@macts/calendar': minor
'@macts/calendar-server': minor
'@macts/microsoft-edge': minor
'@macts/microsoft-edge-server': minor
'@macts/omnifocus': minor
'@macts/omnifocus-server': minor
'@macts/omnigraffle': minor
'@macts/omnigraffle-server': minor
'@macts/omniplan': minor
'@macts/omniplan-server': minor
'@macts/photos': minor
'@macts/photos-server': minor
'@macts/reminders': minor
'@macts/reminders-server': minor
'@macts/shortcuts': minor
'@macts/shortcuts-server': minor
'@macts/xcode': minor
'@macts/xcode-server': minor
---

Breaking: CRUD operations are published under their operation name instead of the manifest's internal command key. Every get, list, create, update, and delete route and operation id is now `<app>.<resource plural>.<get|list|create|update|delete>`; for example, `calendar.events.getEvent` is now `calendar.events.get`, and `reminders.reminders.listReminders` is now `reminders.reminders.list`. This moves 90 routes across Automator, Calendar, Microsoft Edge, OmniFocus, OmniGraffle, OmniPlan, Photos, Reminders, Shortcuts, and Xcode.

Permissions do not change. SDK, CLI, and MCP method, command, and tool names do not change.
