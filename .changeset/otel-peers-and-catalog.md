---
'@macts/api': patch
'@macts/core': patch
---

Removed the unused optional `@opentelemetry/sdk-node` and `@opentelemetry/exporter-trace-otlp-http` peer dependencies from `@macts/api` (nothing imports them; `configureTelemetry` is a no-op stub, and its docs now say so plainly instead of implying tracing activates once the SDK is installed). Also moved `clipanion`, `typanion`, and `zod` to the pnpm catalog so their version ranges are declared once and stay consistent across the workspace and generated packages.
