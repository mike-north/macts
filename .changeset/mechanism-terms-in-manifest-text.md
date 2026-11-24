---
'@macts/core': minor
'@macts/mail': patch
'@macts/music': patch
'@macts/omnifocus': patch
'@macts/omnigraffle': patch
'@macts/omniplan': patch
'@macts/script-editor': patch
'@macts/tv': patch
---

Manifest validation now rejects a manifest whose text names the automation mechanism: any description, name or key outside a claim's `evidence` and the `extraction` notes. Every surface derives its text from the manifest, so capabilities, contracts, the CLI, clients and MCP tools no longer carry these terms. `MECHANISM_TERMS` is the one definition of the terms, and `findMechanismTermIssues` reports where a manifest names one.

The Music and TV `count` and `make` inputs, Script Editor's document `language`, Mail's rule `runScript`, OmniGraffle's attached `script`, and the OmniFocus and OmniPlan suite descriptions now say what each is without naming the mechanism.
