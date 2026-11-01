import { defineConfig } from 'tsup'

// Two entry points: `.` (remote client and contracts, no Mac-side code) and
// `./local` (in-process client over the Mac-side runtime). Code they share is
// split into chunks, so the remote entry never pulls in the local one.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    local: 'src/local.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
})
