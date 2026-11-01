---
'@macts/reminders': minor
'@macts/reminders-server': minor
---

The operation that marks a reminder complete is now `reminders.reminders.complete`, matching its SDK method (`reminders.complete`) and its MCP tool (`macts__reminders__reminders_complete`). Breaking for callers that address the operation by its id or route, which was `reminders.reminders.completeReminder`. Its permission is unchanged (`reminders:reminders:update`).
