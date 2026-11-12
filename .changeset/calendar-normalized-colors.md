---
'@macts/core': patch
'@macts/calendar': patch
---

Convert Calendar's normalized color components to 16-bit RGB channels on reads and back to fractions on writes. Other apps retain their declared color representation.
