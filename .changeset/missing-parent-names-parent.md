---
'@macts/core': minor
---

An operation on an item under a parent now names the parent when the parent is missing. Getting a Calendar event in a calendar that does not exist fails with `TargetNotFoundError` whose `resource` is `Calendar`, where it was `Event`; the same holds for every list, get, create, update and delete scoped to a parent, such as a Music track in a playlist or a Contacts email address of a person. A missing item in a parent that exists still names the item's own resource.

`NativeFailure` from the app may now carry `missingResource`, the resource the operation found missing when it is not the operation's own.
