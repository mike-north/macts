---
'@macts/system-events': minor
---

System Events records now include the fields their class inherits in the app's dictionary.

- A `Folder` is a disk item, so its record has a disk item's fields: name, displayed name, POSIX path, URL, sizes, dates and the rest. The disk item a folder is in stays out of output until disk items can be read.
- The user domain and the Classic domain are domains, so `UserDomainObject` and `ClassicDomainObject` records have the domain's `id` and `name`. Their folders stay out of output until folders can be read.
