import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'contract/index': 'src/contract/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
})
