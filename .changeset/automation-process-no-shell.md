---
'@macts/core': patch
---

Pass the script to the automation process without a shell. Script text, and every value embedded in it, now reaches the process byte for byte, so values containing quotes, backslashes, or newlines arrive unchanged. Bundle identifiers, element names, selector values, and property keys are embedded in generated scripts as literals. A process that exits before reading a large script now rejects the call instead of crashing the host process.
