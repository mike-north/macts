---
'@macts/core': minor
---

The manifest command schema now rejects fields it does not know. A command, a command parameter or a permission-history entry with an unrecognised key fails to load, where the key was previously dropped silently. A future field that withholds or restricts a command therefore fails closed on a runtime that predates it, instead of being stripped and the command offered.
