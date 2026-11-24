import { defineConfig } from 'tsup'

export default defineConfig({
  // The testing subpath provides internal test support; generator exposes package
  // generation. Both are built alongside the main entry, which alone is covered
  // by the root API report.
  entry: ['src/index.ts', 'src/testing.ts', 'src/generator/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
