---
'@macts/core': minor
'@macts/mail': minor
---

A command's `unsupported` marker now also accepts dictionary handler evidence: the app's dictionary documents the command as a handler the app sends to a user's script, not a command it carries out. Such a command has no route, operation, tool, capability or derived permission, and the SDKs and the CLI omit it. The new `DictionaryHandlerEvidenceSchema` and `CommandUnsupportedEvidenceSchema` describe the evidence.

Mail's `performMailActionWithMessages`, a handler Mail sends to scripts when a rule or menu item runs one, is marked this way and is no longer offered.
