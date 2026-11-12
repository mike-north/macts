---
'@macts/core': minor
---

`@macts/core/testing` now exports `standInPanes`, a stand-in app of windows holding tabs that have no id, for testing apps whose tabs are selected by their position within their window. Its windows and tabs can carry extra fields, so it can stand in for an app such as iTerm.
