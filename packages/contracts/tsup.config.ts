import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/client/index.ts'],
  format: ['esm'],
  // Keep the self-reference external so client declarations reuse root brands.
  external: ['@macts/contracts'],
  dts: true,
  clean: true,
  sourcemap: true,
})
