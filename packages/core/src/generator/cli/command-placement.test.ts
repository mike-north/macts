/**
 * Where a resource command sits in the generated CLI. A command whose address
 * declares its ancestors sits under exactly those ancestors' collections,
 * followed by its target's collection: a Session read addressed by its Window
 * alone, which searches every Tab of that Window, is a Window-scoped command
 * (`windows sessions resolve`), not a Tab-scoped one. Collections an identity
 * traversal searches are not part of the path, because the caller never
 * selects within them. A command that declares no ancestors keeps its
 * resource's hierarchy path.
 *
 * Expected paths are written by hand from the fixture's hierarchy
 * (`windows` → `tabs` → `sessions`) and each command's declared address.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D10, "Multilevel addresses and identity scope")
 * @see ../../../../../manifests/README.md (operation addresses)
 */
import { describe, expect, it } from 'vitest'
import { generateCliPlugin } from './index.js'
import { commandCliSegments } from './placement.js'
import { normalizeManifestAddresses } from '../../manifest/normalize-addresses.js'
import { panesManifest } from '../../manifest/test-support/panes-positional.js'
import { deriveCapabilities } from '../../capabilities/registry.js'
import type { AppManifest } from '../../manifest/index.js'

/**
 * Panes with Sessions inside Tabs inside Windows. Session identity is scoped
 * to the Window: `listSessions` and `getSession` select a Tab by position
 * within a Window, while `resolveSession` and `writeSessionText` take only the Window and
 * search every Tab of it.
 */
function sessionManifest(): AppManifest {
  const manifest = Object.assign(panesManifest(), { version: '1.1' as const })
  manifest.resources['Session'] = {
    name: 'Session',
    plural: 'Sessions',
    description: 'A terminal session',
    properties: {
      id: {
        access: 'r',
        type: 'string',
        description: 'Session identity',
        code: 'ID  ',
        optional: false,
      },
    },
    identifiers: [{ property: 'id', primary: true }],
  }
  const tab = manifest.hierarchy.children['windows']?.children?.['tabs']
  if (tab === undefined) throw new Error('Fixture requires windows and tabs')
  tab.children = { sessions: { resource: 'Session', access: 'r' } }
  manifest.commands['listSessions'] = {
    name: 'list',
    description: 'List the sessions in a tab',
    scope: 'resource',
    resourceType: 'Session',
    resolvesReferences: false,
    parents: [
      { resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' },
      { resource: 'Tab', collection: 'tabs', by: 'index', parameter: 'tabIndex' },
    ],
    parameters: [
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
      { name: 'tabIndex', type: 'integer', description: 'Tab position', required: true },
    ],
  }
  manifest.commands['getSession'] = {
    name: 'get',
    routeName: 'getWithinTab',
    description: 'Read a session by id in a tab',
    scope: 'resource',
    resourceType: 'Session',
    resolvesReferences: false,
    parents: [
      { resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' },
      { resource: 'Tab', collection: 'tabs', by: 'index', parameter: 'tabIndex' },
    ],
    item: { by: 'identity', parameter: 'sessionId' },
    parameters: [
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
      { name: 'tabIndex', type: 'integer', description: 'Tab position', required: true },
      { name: 'sessionId', type: 'string', description: 'Session identity', required: true },
    ],
  }
  manifest.commands['resolveSession'] = {
    name: 'get',
    routeName: 'resolve',
    description: 'Resolve Session identity within its Window',
    scope: 'resource',
    resourceType: 'Session',
    parent: { resource: 'Window', parameter: 'windowId' },
    identityTraversal: { collections: ['tabs'], evidence: 'Sessions are elements of tabs' },
    parameters: [
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
      { name: 'sessionId', type: 'string', description: 'Session identity', required: true },
    ],
  }
  manifest.commands['writeSessionText'] = {
    name: 'write',
    routeName: 'writeText',
    description: 'Write text into a session',
    scope: 'resource',
    resourceType: 'Session',
    risk: 'write',
    parents: [{ resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' }],
    item: { by: 'identity', parameter: 'sessionId' },
    identityTraversal: { collections: ['tabs'], evidence: 'Sessions are elements of tabs' },
    parameters: [
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
      { name: 'sessionId', type: 'string', description: 'Session identity', required: true },
      { name: 'text', type: 'string', description: 'Text to write', required: true },
    ],
  }
  return manifest
}

/** The generated CLI's command files, keyed by path, and each file's command path. */
function generatedCommands(manifest: AppManifest): Map<string, string> {
  const result = generateCliPlugin(manifest, {
    packageName: '@macts/panes',
    sdkPackageName: '@macts/panes',
  })
  expect(result.errors).toEqual([])
  const commands = new Map<string, string>()
  for (const file of result.files) {
    if (!file.path.startsWith('src/commands/')) continue
    const paths = /static override paths = \[\[(.*)\]\]/.exec(file.content)?.[1]
    if (paths === undefined) throw new Error(`No command path in ${file.path}`)
    commands.set(file.path, paths.replace(/['"]/g, '').split(', ').join(' '))
  }
  return commands
}

describe('CLI command placement follows the command address', () => {
  it('places a Window-addressed Session read under the Window, not under its Tabs', () => {
    const commands = generatedCommands(sessionManifest())
    expect(commands.get('src/commands/windows/sessions/resolve.ts')).toBe(
      'panes windows sessions resolve'
    )
    expect(commands.has('src/commands/windows/tabs/sessions/resolve.ts')).toBe(false)
  })

  it('places a Window-addressed Session item command under the Window', () => {
    const commands = generatedCommands(sessionManifest())
    expect(commands.get('src/commands/windows/sessions/write.ts')).toBe(
      'panes windows sessions write'
    )
    expect(commands.has('src/commands/windows/tabs/sessions/write.ts')).toBe(false)
  })

  it('keeps a command that selects a Tab under that Tab', () => {
    const commands = generatedCommands(sessionManifest())
    expect(commands.get('src/commands/windows/tabs/sessions/list.ts')).toBe(
      'panes windows tabs sessions list'
    )
    expect(commands.get('src/commands/windows/tabs/sessions/get.ts')).toBe(
      'panes windows tabs sessions get'
    )
    expect(commands.get('src/commands/windows/tabs/list.ts')).toBe('panes windows tabs list')
  })

  it('emits each placed command once, with imports relative to its own directory', () => {
    const result = generateCliPlugin(sessionManifest(), {
      packageName: '@macts/panes',
      sdkPackageName: '@macts/panes',
    })
    const resolve = result.files.filter(({ path }) => path.endsWith('/resolve.ts'))
    expect(resolve.map(({ path }) => path)).toEqual(['src/commands/windows/sessions/resolve.ts'])
    // src/commands/windows/sessions/ is three levels below src/.
    expect(resolve[0]?.content).toContain("from '../../../sdk.js'")
    const plugin = result.files.find(({ path }) => path === 'src/plugin.ts')?.content
    expect(plugin).toContain("from './commands/windows/sessions/resolve.js'")
    expect(plugin).not.toContain('tabs/sessions/resolve')
  })

  it('names the same path in the discovery snippet as the CLI command', () => {
    const snippets = new Map(
      deriveCapabilities(sessionManifest()).map(({ name, cliSnippet }) => [name, cliSnippet])
    )
    expect(snippets.get('panes.sessions.resolve')).toBe(
      'macts panes windows sessions resolve --window-id <windowId> <sessionId>'
    )
    expect(snippets.get('panes.sessions.writeText')).toBe(
      'macts panes windows sessions write --window-id <windowId> <sessionId> --text <text>'
    )
    expect(snippets.get('panes.sessions.getWithinTab')).toBe(
      'macts panes windows tabs sessions get --window-id <windowId> --tab-index <tabIndex> <sessionId>'
    )
    expect(snippets.get('panes.sessions.listSessions')).toBe(
      'macts panes windows tabs sessions list --window-id <windowId> --tab-index <tabIndex>'
    )
  })
})

describe('commandCliSegments', () => {
  const sessionsPath = ['windows', 'tabs', 'sessions']

  it('drops the traversed collections from a traversal command reached through them', () => {
    const manifest = normalizeManifestAddresses(sessionManifest())
    const resolve = manifest.commands['resolveSession']
    if (resolve === undefined) throw new Error('Fixture requires resolveSession')
    expect(commandCliSegments(manifest, resolve, sessionsPath)).toEqual(['windows', 'sessions'])
  })

  it('refuses a hierarchy path the command address does not reach', () => {
    const manifest = normalizeManifestAddresses(sessionManifest())
    const resolve = manifest.commands['resolveSession']
    const list = manifest.commands['listSessions']
    if (resolve === undefined || list === undefined) throw new Error('Fixture requires sessions')
    // Sessions directly under Windows would be a different containment edge.
    expect(commandCliSegments(manifest, resolve, ['windows', 'sessions'])).toBeUndefined()
    expect(commandCliSegments(manifest, list, ['sessions'])).toBeUndefined()
  })

  it('keeps the hierarchy path when the address names every collection on it', () => {
    const manifest = normalizeManifestAddresses(sessionManifest())
    const list = manifest.commands['listSessions']
    if (list === undefined) throw new Error('Fixture requires listSessions')
    expect(commandCliSegments(manifest, list, sessionsPath)).toEqual(sessionsPath)
  })

  it('keeps the hierarchy path of a command that declares no ancestors', () => {
    const manifest = normalizeManifestAddresses(sessionManifest())
    const listWindows = manifest.commands['listWindows']
    if (listWindows === undefined) throw new Error('Fixture requires listWindows')
    expect(commandCliSegments(manifest, listWindows, ['windows'])).toEqual(['windows'])
  })

  it('keeps the hierarchy path for format 1.0, whose parents name no hierarchy edges', () => {
    const manifest = panesManifest()
    const listTabs = manifest.commands['listTabs']
    if (listTabs === undefined) throw new Error('Fixture requires listTabs')
    expect(commandCliSegments(manifest, listTabs, ['windows', 'tabs'])).toEqual(['windows', 'tabs'])
  })
})
