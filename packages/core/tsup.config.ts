import { defineConfig } from 'tsup'

export default defineConfig({
  // `testing` is the internal test-support entry (`@macts/core/testing`). It
  // is built beside the public entry but is not part of the API report, which
  // api-extractor takes from `dist/index.d.ts` alone.
  entry: ['src/index.ts', 'src/testing.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
