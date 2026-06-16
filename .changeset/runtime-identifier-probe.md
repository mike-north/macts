---
'@macts/core': minor
'@macts/cli': minor
---

Add runtime identifier probe to validate manifest identifier claims against the live app

Manifests are sdef-derived and contain identifier claims that may not work at runtime.
Calendar's declared primary identifier `calendarIdentifier` throws "AppleEvent handler
failed" via JXA while `name` works — a systemic gap that could affect other apps too.

**`@macts/core`**:

- New `probe` field on `ResourceSchema` — optional `RuntimeProbeSchema` block written by
  the probe tool, carrying `status`, `runtimeIdentifier`, `probedAt`, and `note`. The
  sdef-declared `identifiers` array is untouched (preserved for provenance); `probe` is
  purely additive metadata.
- New `ProbeStatusSchema` / `ProbeStatus` type: `'probed' | 'no-items' | 'failed' | 'error'`.
- New `probeManifest(manifest, runner, options?)` function — probes each resource by
  reading the first item of the collection and attempting each declared identifier property
  (primary first), plus common fallbacks (`name`, `id`), recording which returns a value
  vs. throws. The JXA-execution layer is **injectable** (`JxaRunner` type) so unit tests
  exercise the full probe logic with fake runners — no real apps or TCC grants required.
- New `writeProbeResults(manifestPath, result)` — merges probe results back into the
  manifest YAML file, upserting `resource.probe` for each probed resource.

**`@macts/cli`**:

- New `macts probe <app>` subcommand — loads an app's manifest, runs the probe with
  the real JXA executor, prints per-resource results (human or `--json`), and writes the
  updated probe metadata back into the manifest unless `--dry-run` is set. Supports
  `--resource <Name>` to target a single resource and `--manifests-dir` for custom
  manifest locations.
