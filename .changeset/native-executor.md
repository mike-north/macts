---
'@macts/core': minor
---

Add the native macOS executor. `createNativeExecutor()` implements the executor seam: it runs manifest-defined operations against the target app and reports failures as the canonical structured errors, so a missing target, an app that is not installed or not responding, missing automation permission, and a timeout are each distinguishable. `buildNativeBody()` produces the script body for one operation; input values are read at run time and never written into script text.
