---
'@macts/core': patch
'@macts/mail': minor
'@macts/contacts': minor
---

Return the scalar values declared by Mail and Contacts commands instead of discarding them. Mail `outgoingMessages.send` returns `boolean | null`; Contacts `actionProperty` and `actionTitle` return `string | null`, and `performAction` and `shouldEnableAction` return `boolean | null`.

Generated CLI commands print a declared, available result using the existing human or JSON formatter. Values such as `false`, `0`, empty text and explicit null remain data; JSON output uses the `data` field. Commands without an effective result retain their existing success message. Result validation and nullable defaults remain shared with the SDK contract.

Other command results and reference retrieval gaps remain separate work.
