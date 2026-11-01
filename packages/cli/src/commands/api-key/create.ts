import { Command, Option } from 'clipanion'
import { createApiKey, type CreateApiKeyResult } from '@macts/runtime'
import {
  loadManifest,
  loadManifestsFromDir,
  listKnownPermissions,
  suggestPermissions,
  explainInvalidPermission,
  findCaseOnlyMismatch,
  isCoarseOperation,
  isValidPermission,
  parsePermission,
  type AppManifest,
  type PermissionsSection,
} from '@macts/core'
import { resolveManifestsDir } from '../capabilities/registry.js'
import { createFormatter } from '../../output/index.js'
import * as path from 'node:path'
import * as fs from 'node:fs'

/**
 * Create a new API key.
 */
export class ApiKeyCreateCommand extends Command {
  static override paths = [['api-key', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new API key',
    details: `
      Creates a signed API key with the specified permissions.

      Permission format is "app:resource:operation". The app is lowercase; the
      resource and operation are camelCase (calendar:events:list,
      photos:mediaItems:list, iterm:sessions:splitVertically) or "*".
      Permissions are case-sensitive. A grant authorizes a call when it
      matches exactly or via a wildcard:

        - Fine-grained (calendar:events:list) authorizes exactly that call.
        - Resource wildcard (calendar:events:*) authorizes every operation on
          the resource; app wildcard (calendar:*:*) authorizes everything.

      Coarse operations (read/create/write/delete) are sugar that must be
      expanded against a manifest with --manifest; they are resolved into the
      fine-grained operations they cover at creation time. A coarse permission
      without --manifest is rejected (it would authorize nothing), with a hint
      naming the wildcard or fine-grained permissions to use instead.

      When the app's manifest is known (--manifest, or the manifests directory
      discovered as for "macts capabilities"), a permission that differs from a
      real one only in letter case is rejected naming the correct one, and a
      well-formed permission the manifest does not define is accepted with a
      warning on stderr, since later app versions may add it.

      The key is displayed once and cannot be retrieved later.
    `,
    examples: [
      [
        'Create a read-only key (all read operations, via manifest expansion)',
        '$0 api-key create --name "CI" --permission "calendar:*:read" --manifest ./manifests/calendar/app.yaml',
      ],
      [
        'Create a key for all operations on a resource',
        '$0 api-key create --name "Bot" --permission "calendar:events:*"',
      ],
      [
        'Create a key with specific fine-grained permissions',
        '$0 api-key create --name "Bot" --permission "calendar:events:list" --permission "calendar:events:create"',
      ],
      [
        'Create a key with expiration',
        '$0 api-key create --name "Temp" --permission "calendar:events:list" --expires 30d',
      ],
    ],
  })

  name = Option.String('--name', { required: true, description: 'Human-readable name for the key' })
  permission = Option.Array('--permission', {
    description: 'Permission to grant, app:resource:operation (can be repeated)',
  })
  expires = Option.String('--expires', { description: 'Expiration (e.g., 30d, 1h, 2w)' })
  manifest = Option.String('--manifest', {
    description: 'Path to manifest file for permission expansion',
  })
  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)
    const permissions = this.permission ?? []

    if (permissions.length === 0) {
      this.context.stderr.write(
        formatter.formatError('At least one --permission is required') + '\n'
      )
      return 1
    }

    try {
      // Load the manifest(s) that tell us which permissions really exist:
      // the explicit --manifest, else whatever the shared discovery finds.
      let permissionsSection: PermissionsSection | undefined
      let manifests: AppManifest[] = []
      if (this.manifest) {
        const manifestPath = path.resolve(this.manifest)
        if (!fs.existsSync(manifestPath)) {
          this.context.stderr.write(
            formatter.formatError(`Manifest not found: ${manifestPath}`) + '\n'
          )
          return 1
        }
        const manifest = await loadManifest(manifestPath)
        permissionsSection = manifest.permissions
        manifests = [manifest]
      } else {
        manifests = await discoverManifests()
      }
      const known = manifests.flatMap((manifest) => listKnownPermissions(manifest))

      // Reject permissions that could never authorize anything.
      const invalid = permissions.filter((p) => !isValidPermission(p))
      if (invalid.length > 0) {
        const lines = invalid.map((p) => `"${p}": ${explainInvalidPermission(p, known)}`)
        this.context.stderr.write(
          formatter.formatError(`Invalid permission format:\n${lines.join('\n')}`) + '\n'
        )
        return 1
      }
      const mismatches = permissions.flatMap((p) => {
        const canonical = findCaseOnlyMismatch(p, known)
        return canonical === undefined
          ? []
          : [`"${p}" differs from "${canonical}" only in letter case`]
      })
      if (mismatches.length > 0) {
        this.context.stderr.write(
          formatter.formatError(
            `${mismatches.join('; ')}. Permissions are case-sensitive, so a mis-cased permission ` +
              'would never authorize anything. Use the correctly cased permission.'
          ) + '\n'
        )
        return 1
      }
      const declaredOnly = manifests.flatMap((manifest) =>
        Object.values(manifest.permissions ?? {}).flatMap((coarse) => Object.values(coarse).flat())
      )
      for (const warning of unknownPermissionWarnings(permissions, known, declaredOnly)) {
        this.context.stderr.write(`warning: ${warning}\n`)
      }

      const result = await createApiKey(
        {
          name: this.name,
          permissions,
          expires: this.expires,
          knownPermissions: known,
        },
        permissionsSection
      )

      if (this.json) {
        this.context.stdout.write(formatter.format(formatResult(result)) + '\n')
      } else {
        this.context.stdout.write('\n')
        this.context.stdout.write(`API Key: ${result.token}\n`)
        this.context.stdout.write(`Key ID: ${result.keyId}\n`)
        this.context.stdout.write(`Name: ${result.metadata.name}\n`)
        this.context.stdout.write(`Permissions: ${result.metadata.permissions.join(', ')}\n`)
        if (result.metadata.expiresAt) {
          this.context.stdout.write(`Expires: ${result.metadata.expiresAt.toISOString()}\n`)
        }
        this.context.stdout.write('\n')
        this.context.stdout.write('Save this key securely - it cannot be retrieved later.\n')
      }

      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}

function formatResult(result: CreateApiKeyResult): object {
  return {
    token: result.token,
    keyId: result.keyId,
    name: result.metadata.name,
    permissions: result.metadata.permissions,
    originalPermissions: result.metadata.originalPermissions,
    createdAt: result.metadata.createdAt.toISOString(),
    expiresAt: result.metadata.expiresAt?.toISOString(),
  }
}

/**
 * Load the manifests the CLI can already find without `--manifest`, using the
 * same discovery as `macts capabilities`. Discovery is best-effort: when no
 * manifests directory exists or it cannot be read, no manifests are known and
 * key creation proceeds on the grammar alone.
 */
async function discoverManifests(): Promise<AppManifest[]> {
  const manifestsDir = resolveManifestsDir()
  if (manifestsDir === null) {
    return []
  }
  return (await loadManifestsFromDir(manifestsDir)).manifests
}

/**
 * Warnings for well-formed permissions of a known app that name no permission
 * the app defines. They are not errors: a later app version may add the route.
 * Wildcards and coarse operations (expanded against the manifest) are not
 * checked here, and apps without a known manifest cannot be judged.
 */
function unknownPermissionWarnings(
  permissions: string[],
  known: string[],
  declaredInPermissionsMap: string[]
): string[] {
  const knownApps = new Set(known.map((p) => p.split(':')[0]))
  return permissions.flatMap((permission) => {
    const parsed = parsePermission(permission)
    if (
      !knownApps.has(parsed.app) ||
      known.includes(permission) ||
      parsed.resource === '*' ||
      parsed.operation === '*' ||
      isCoarseOperation(parsed.operation)
    ) {
      return []
    }
    if (declaredInPermissionsMap.includes(permission)) {
      return [
        `"${permission}" is listed in the ${parsed.app} manifest's permissions map, but no ` +
          `${parsed.app} route requires it yet, so it authorizes nothing today.`,
      ]
    }
    const suggestions = suggestPermissions(permission, known)
    const hint =
      suggestions.length > 0 ? ` Closest: ${suggestions.map((s) => `"${s}"`).join(', ')}.` : ''
    return [`"${permission}" is not a permission any known ${parsed.app} route requires.${hint}`]
  })
}
