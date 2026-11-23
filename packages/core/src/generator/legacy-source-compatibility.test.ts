/**
 * Mechanical format 1.0 compatibility against exact 4cf0e8c4 generator output.
 * Source fingerprints cover contract bindings, SDK/HTTP methods and CLI forwarding;
 * independently derived capability metadata is outside this calling-source inventory.
 * named-argument behavior is independently asserted by application-command tests.
 * The generated inventory must only be captured with that pinned base generator.
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { z } from 'zod'
import { parseManifestYaml } from '../manifest/loader.js'
import { AppManifestSchema } from '../manifest/schemas/app.js'
import { generateConsolidatedPackages } from './orchestrate.js'
import { commandMethodParameters } from './surface.js'
import { legacyApplicationParent } from './test-support/legacy-application-parent.js'

const hashes = z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/))
/** A base commit and complete case inventory prevent an empty or substituted comparison. */
const baseline = z
  .object({
    commit: z.literal('4cf0e8c476db1adbd83b3efa817a6fa414e954f4'),
    cases: z.record(z.string(), z.object({ sources: hashes, methods: hashes })),
  })
  .parse(
    JSON.parse(
      readFileSync(
        new URL('./test-support/format-1.0-source-digests.json', import.meta.url),
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
const fixtures = ['integer', 'string'].map((domain) => ({
  name: `application-parent-${domain}`,
  manifest: legacyApplicationParent(domain === 'integer' ? 'integer' : 'string'),
}))
const cases = [...shipped, ...fixtures]

it('includes every shipped 1.0 app and both legacy application-parent domains', () => {
  expect(shipped).toHaveLength(34)
  expect(cases.map(({ name }) => name).sort()).toEqual(Object.keys(baseline.cases).sort())
})

it.each(cases)(
  'retains base signatures, forwarding and generated source bytes for $name',
  ({ name, manifest }) => {
    expect(AppManifestSchema.safeParse(manifest).success).toBe(true)
    const generated = generateConsolidatedPackages(manifest, { appName: name })
    expect(generated.errors).toEqual([])
    const sources = Object.fromEntries(
      ['client', 'server'].flatMap((kind) => {
        const files = kind === 'client' ? generated.client.files : generated.server.files
        return files
          .filter(
            ({ path }) =>
              path.startsWith('src/') && path.endsWith('.ts') && path !== 'src/capabilities.ts'
          )
          .map(({ path, content }) => [`${kind}/${path}`, digest(content)])
      })
    )
    expect(Object.keys(sources)).toContain('client/src/contract/index.ts')
    expect(Object.keys(sources)).toContain('client/src/client.ts')
    expect(Object.keys(sources)).toContain('client/src/cli/index.ts')
    const methods = Object.fromEntries(
      Object.entries(manifest.commands).map(([key, command]) => [
        key,
        digest(JSON.stringify(commandMethodParameters(command))),
      ])
    )
    expect({ sources, methods }).toEqual(baseline.cases[name])
  }
)
