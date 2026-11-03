---
'@macts/core': patch
---

A call whose input or result holds a value of a kind the macOS provider cannot convert yet (a reference, a file, or a file source) now fails with an internal error that names the operation, the kind and the position, instead of an input error that blamed the caller, or an unexpected-value error that blamed the app. For example, the Contacts rollover actions, which take a person, now report that the macOS provider does not support reference values yet. A call with such an input still fails before the app is contacted.
