---
'@macts/core': patch
---

When the app fails a read inside a list or a get, the error's cause now says what was being read: a property by its manifest name, with its position in the result (`while reading the property "holder" at [2]`), or the items themselves. It names properties and positions only, never a value the app returned. The error's class and message are unchanged.
