/**
 * Regression tests for the CLI command generator.
 *
 * These guard against strict-mode typecheck failures in generated CLI commands —
 * the defects fixed in the "generated CLI commands fail `pnpm typecheck`" repo-health
 * work. The generated commands bridge a type-erasure boundary (CLI flags -> SDK
 * method parameters), and earlier output used casts that strict TypeScript rejects:
 *
 *  - `create` passed `{...} as Record<string, unknown>` to a precise `*CreateInput`
 *    (rejected: `unknown` index value not assignable to `never`/exact-optional members).
 *  - app/resource command args used `this.x as unknown`, and `unknown` is assignable
 *    to no concrete SDK parameter type.
 *  - a `path` command parameter produced a class field named `path`, shadowing
 *    Clipanion's `Command.path: Array<string>` member with an incompatible type.
 *  - self-nested hierarchies (and commands whose parameter is the resource's own ID)
 *    emitted a duplicate identifier for the resource-ID option.
 *
 * @see https://clipanion.dev/ (Clipanion `Command` reserved members: path, cli, context, help)
 */

import { describe, it, expect } from 'vitest'
import { generateCliPlugin } from './index.js'
import type { AppManifest } from '../../manifest/index.js'

/** Build a minimal manifest exercising each generator code path under test. */
function buildManifest(): AppManifest {
  return {
    version: '1.0',
    app: {
      bundleId: 'com.example.testapp',
      name: 'TestApp',
      displayName: 'Test App',
      tccEntitlements: [],
    },
    suites: [],
    resources: {
      Calendar: {
        name: 'Calendar',
        plural: 'Calendars',
        description: 'A calendar',
        properties: {
          calendarIdentifier: {
            access: 'r',
            type: 'string',
            description: 'Calendar ID',
            optional: false,
          },
          // A writable property — appears in the create-input object.
          name: { access: 'rw', type: 'string', description: 'Calendar name', optional: false },
          // A writable boolean — surfaces as `boolean | undefined` from the flag.
          shared: { access: 'rw', type: 'boolean', description: 'Is shared', optional: true },
        },
        identifiers: [{ property: 'calendarIdentifier', primary: true }],
      },
      Folder: {
        name: 'Folder',
        plural: 'Folders',
        description: 'A folder',
        properties: {
          name: { access: 'r', type: 'string', description: 'Folder name', optional: false },
        },
        identifiers: [{ property: 'name', primary: true }],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        calendars: { resource: 'Calendar', access: 'rw' },
        // Self-nested folder hierarchy: the inner `folders` get command receives a
        // parent param named `folderId` AND its own resource id `folderId`.
        folders: {
          resource: 'Folder',
          access: 'r',
          children: {
            folders: { resource: 'Folder', access: 'r' },
          },
        },
      },
    },
    relationships: [],
    commands: {
      list: { name: 'list', description: 'List', scope: 'resource', parameters: [] },
      get: { name: 'get', description: 'Get', scope: 'resource', parameters: [] },
      create: { name: 'create', description: 'Create', scope: 'resource', parameters: [] },
      // App command whose parameter name (`path`) clashes with Clipanion's reserved
      // `Command.path` member, and which has a non-string-overlapping return-less param.
      browse: {
        name: 'browse',
        description: 'Browse a path',
        scope: 'application',
        parameters: [
          { name: 'path', type: 'string', description: 'The path to browse', required: true },
        ],
      },
    },
  }
}

function fileContent(result: ReturnType<typeof generateCliPlugin>, pathSuffix: string): string {
  const file = result.files.find((f) => f.path.endsWith(pathSuffix))
  expect(file, `expected a generated file ending in ${pathSuffix}`).toBeDefined()
  return file?.content ?? ''
}

describe('generateCliPlugin command casts', () => {
  const options = {
    packageName: '@macts/testapp',
    sdkPackageName: '@macts/sdk-testapp',
  }

  it('asserts the create input to the SDK type via `unknown`, never Record<string, unknown>', () => {
    const result = generateCliPlugin(buildManifest(), options)
    const content = fileContent(result, 'calendars/create.ts')

    // The unsound widening cast must be gone.
    expect(content).not.toContain('as Record<string, unknown>')
    // The create input is asserted to the SDK's exact parameter type via `unknown`,
    // so a precise `*CreateInput` (incl. exact-optional / rich field types) is accepted.
    expect(content).toContain('as unknown as Parameters<typeof client.calendars.create>[0]')
  })

  it('asserts app-command args to exact SDK parameter types, never bare `as unknown`', () => {
    const result = generateCliPlugin(buildManifest(), options)
    const content = fileContent(result, 'browse.ts')

    // `x as unknown` (assignable to no concrete parameter) must not be emitted as the
    // argument; it must be a full `unknown as Parameters<...>` assertion.
    expect(content).not.toMatch(/this\.\w+ as unknown\)/)
    expect(content).toContain('as unknown as Parameters<typeof client.browse>[0]')
  })

  it('renames a `path` parameter so it does not shadow Clipanion`s Command.path member', () => {
    const result = generateCliPlugin(buildManifest(), options)
    const content = fileContent(result, 'browse.ts')

    // The CLI flag stays `--path`, but the class property is disambiguated.
    expect(content).toContain("Option.String('--path'")
    expect(content).toContain('browsePath = Option.String')
    expect(content).toContain('this.browsePath as unknown as Parameters<typeof client.browse>[0]')
    // No bare `path = Option...` field, which would clash with `Command.path`.
    expect(content).not.toMatch(/^\s+path = Option\./m)
  })

  it('does not emit a duplicate identifier for self-nested resource hierarchies', () => {
    const result = generateCliPlugin(buildManifest(), options)
    // The inner folders/folders/get command: parent param `folderId` collides with
    // the resource id `folderId`. Only one `folderId` field may be declared.
    const content = fileContent(result, 'folders/folders/get.ts')

    const folderIdDeclarations = content.match(/^\s*folderId = Option\./gm) ?? []
    expect(folderIdDeclarations).toHaveLength(1)
  })
})
