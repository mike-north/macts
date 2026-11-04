---
'@macts/core': minor
---

Manifests can describe an app that reports an absent value by failing the read.

Probe nullability evidence can record `errorNumbers`. When some reads failed, every failed read raised "no such object" (-1728), and at least one read succeeded, the evidence supports `nullable: true`, and a read of that property failing that way returns `null` after the item itself is found, in a get, a resolved reference and a list's item-by-item reads. Evidence whose every read failed describes structural absence, which is `unsupported`, not nullable. The same failure of any other property, and any other failure, still fails.

New exports: `ABSENT_VALUE_ERROR_NUMBER` (-1728); `reportsAbsence`, which says whether nullability evidence records only that failure; and `readsAbsentAsNull`, which says whether a property reads that failure as `null`.
