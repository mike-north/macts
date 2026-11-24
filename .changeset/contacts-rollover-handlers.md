---
'@macts/contacts': minor
---

Contacts' `actionProperty`, `actionTitle`, `performAction` and `shouldEnableAction` are no longer offered. Contacts' dictionary defines them in its hidden Address Book Rollover Suite as events Contacts sends to Rollover plug-ins, not operations a caller can run, so they are now marked unsupported with dictionary handler evidence and leave every route, tool, SDK client, CLI command and discovery result.
