---
'@macts/core': patch
---

A generated HTTP client's `list` now sends a required integer parameter, such as a window id, in the integer form the operation's input accepts; before, it sent a bare number, which the input rejected. The generated CLI's `list` converts the flag's text to that number.
