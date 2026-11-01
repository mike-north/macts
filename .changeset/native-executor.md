---
'@macts/core': minor
---

Add the native macOS executor. `createNativeExecutor()` implements the executor seam: it runs manifest-defined operations against the target app and reports failures as the canonical structured errors, so a missing target, an app that is not installed or not responding, missing automation permission, and a timeout are each distinguishable. A missing target, or a missing parent of a scoped operation, fails as a missing target before anything is read, changed, or deleted. Host failures (an automation host that cannot start, a process killed from outside, oversized output) are internal errors, never blamed on the app. `buildNativeBody()` produces the script body for one operation; input values are read at run time and never written into script text.

The automation transport now reports every process failure as a `JxaExecutionError` with a `kind`: `timed-out`, `cancelled`, `output-too-large`, `not-started`, `signalled`, `exited`, or `unreadable-output`. `timedOut` is true only when the transport's own time limit stopped the process. `runJxa()` accepts an abort `signal`, which stops the process, and `maxOutputBytes`. Output is read up to `MAX_OUTPUT_BYTES` (64 MiB) per stream, up from 1 MiB, so large list results no longer fail.
