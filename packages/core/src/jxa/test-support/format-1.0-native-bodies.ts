/**
 * The native bodies a format 1.0 manifest produces, gathered for byte comparison
 * against a pinned base generator. Every command is built under each body option
 * set the bodies vary by, and every resource's reference resolution is built for
 * both cardinalities; a body the generator refuses is recorded by its refusal, so
 * a refusal that changes is caught as well.
 */
import type { AppManifest } from '../../manifest/schemas/app.js'
import { buildNativeBody, buildResolutionBody } from '../native-scripts.js'
import type { NativeBodyOptions } from '../native-scripts.js'

/** Option sets that change body text: untyped aliases, paging, and typed output markers. */
const OPTION_SETS: readonly NativeBodyOptions[] = [
  {},
  { identifierAliases: true },
  { paged: true },
  { containerReferences: false, absentValueMarkers: false },
]

/** A body's text, or `throws: <message>` when the generator refuses it. */
function attempt(build: () => string): string {
  try {
    return build()
  } catch (error) {
    return `throws: ${error instanceof Error ? error.message : String(error)}`
  }
}

/** Every native body of `manifest`, keyed by what produced it, in a stable order. */
export function format10NativeBodies(manifest: AppManifest): Record<string, string> {
  const bodies: Record<string, string> = {}
  for (const [key, command] of Object.entries(manifest.commands).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    // A command over several resource types is built once for each.
    const resources =
      command.resourceType === undefined
        ? [undefined]
        : typeof command.resourceType === 'string'
          ? [command.resourceType]
          : command.resourceType
    for (const resource of resources) {
      OPTION_SETS.forEach((options, index) => {
        bodies[`command:${key}:${resource ?? ''}:${String(index)}`] = attempt(() =>
          buildNativeBody(
            manifest,
            resource === undefined ? { command: key } : { command: key, resource },
            options
          )
        )
      })
    }
  }
  for (const resource of Object.keys(manifest.resources).sort((a, b) => a.localeCompare(b))) {
    for (const cardinality of ['one', 'many'] as const) {
      bodies[`resolution:${resource}:${cardinality}`] = attempt(() =>
        buildResolutionBody(manifest, resource, cardinality)
      )
    }
  }
  return bodies
}
