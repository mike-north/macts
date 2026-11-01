---
'@macts/core': patch
---

Pass the script to the automation process without a shell. Script text, and every value embedded in it, now reaches the process byte for byte, so values containing quotes, backslashes, or newlines arrive unchanged.
