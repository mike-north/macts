---
'@macts/core': patch
---

Fix reading colors from apps: the automation bridge reports a color as three fractions between 0 and 1, which the value codec rejected as non-integer channels. Calendar calendars (`calendars.list`, `calendars.get`) now read correctly, and every app color goes through the same conversion. The color's wire shape, three integer channels from 0 to 65535, is unchanged; a reading outside 0 to 1 is reported as an unexpected value rather than clamped.
