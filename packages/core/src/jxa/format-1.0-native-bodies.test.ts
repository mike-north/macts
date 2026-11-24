/**
 * Format 1.0 native bodies stay byte-identical to the pinned base generator's output.
 * Identity-checked reads exist only in format 1.1, so nothing that hardens them may change
 * a format 1.0 body. The digests were captured from {@link format10NativeBodies} at the
 * recorded base commit, before any later generator change; recapture only with that
 * generator.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { z } from 'zod'
import { parseManifestYaml } from '../manifest/loader.js'
import { format10NativeBodies } from './test-support/format-1.0-native-bodies.js'

/** A pinned base and a complete app inventory prevent an empty or substituted comparison. */
const baseline = z
  .object({
    commit: z.literal('2341796537313e60f761cbdf90dc21d0051a31d7'),
    cases: z.record(
      z.string(),
      z.object({ bodies: z.number().int().positive(), digest: z.string().regex(/^[a-f0-9]{64}$/) })
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(
        new URL('./test-support/format-1.0-native-body-digests.json', import.meta.url),
        'utf8'
      )
    )
  )

/** Fingerprints compare bytes; they are not a behavioral correctness oracle. */
const digest = (text: string): string => createHash('sha256').update(text).digest('hex')
const directory = new URL('../../../../manifests/', import.meta.url)
const shipped = readdirSync(directory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name }) => ({
    name,
    manifest: parseManifestYaml(readFileSync(new URL(`${name}/app.yaml`, directory), 'utf8')),
  }))
  .filter(({ manifest }) => manifest.version === '1.0')

it('compares every shipped format 1.0 app', () => {
  expect(shipped).toHaveLength(34)
  expect(shipped.map(({ name }) => name).sort()).toEqual(Object.keys(baseline.cases).sort())
})

it.each(shipped)('retains the base native body bytes for $name', ({ name, manifest }) => {
  const bodies = format10NativeBodies(manifest)
  expect({ bodies: Object.keys(bodies).length, digest: digest(JSON.stringify(bodies)) }).toEqual(
    baseline.cases[name]
  )
})
