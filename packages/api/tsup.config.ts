import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/server/index.ts', 'src/keys/index.ts', 'src/telemetry.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
