/**
 * Checks the collection accessors that native bodies address against the
 * scripting dictionaries of the apps installed on this Mac.
 *
 * Bodies name a top-level collection as `app["<accessor>"]`: the resource's
 * own collection, or the collection its parent is reached through. Every such
 * accessor is read from the body text, so a parent spelled from an identifier
 * parameter is checked as well as one matched to a resource. The automation
 * bridge resolves an accessor only when it is the app's own spelling of a
 * dictionary term: `ObjectSpecifier.hasInstance(app[name])` is true for a
 * resolved name and false for an unknown one.
 *
 * The check must never launch an app or wait on one, because a CI runner has
 * other apps, no automation grants, and apps that stall on first launch:
 *
 * - `hasInstance` reads the dictionary without sending the app an event, and
 *   does not launch an app that ships a static scripting definition (the
 *   bundle's `OSAScriptingDefinition` file). Rendering a resolved specifier
 *   with `Automation.getDisplayString` does launch it, so it is not used.
 * - An app with no static definition publishes its terms only while running,
 *   so resolving any of them launches it. Such an app is skipped, with that
 *   reason.
 * - Each app is checked in its own `osascript` process with a short time
 *   limit. An app that does not answer in time is reported as not checked; it
 *   is not a failure, except for the system apps every Mac has
 *   ({@link REQUIRED_CHECKED}), which must be checked so the suite can never
 *   pass by checking nothing.
 * - An app the check launched anyway is a failure. A launch is attributed to
 *   the check only when the app was not running as its check began (asked of
 *   Launch Services, through `Application(id).running()`) and its process
 *   started after that instant. An app that was already running, or that
 *   another test launched before the check began, is never counted, even
 *   under full-suite load. The AppKit running-application list is not trusted
 *   for "was it running": in a fresh process it can read empty before the run
 *   loop has turned. It is consulted only for the launch date, after the run
 *   loop has turned.
 *
 * Only top-level collections can be checked this way: under an element
 * specifier, the bridge accepts any name without consulting the dictionary.
 * The checked, skipped, absent, and unanswered apps are printed with each run.
 *
 * Runs on macOS only.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md — D4 (native
 *   script bodies)
 * @see https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html
 * @see https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CocoaKeys.html
 *   (`OSAScriptingDefinition`)
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { OperationTarget } from '@macts/contracts'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import { resolveManifestRoutes } from '../manifest/route.js'
import { buildNativeBody } from './native-scripts.js'

const MANIFESTS_DIR = fileURLToPath(new URL('../../../../manifests/', import.meta.url))

/**
 * Accessors a shipped manifest declares that the app's dictionary does not
 * have, each with the issue tracking the manifest fix. The check expects
 * exactly these to fail: an entry that starts resolving, or that no body
 * addresses any more, must be removed here.
 */
const KNOWN_UNRESOLVED: Readonly<Record<string, string>> = {
  // Parents spelled from an identifier parameter that names no resource of
  // the manifest. The manifest must name the parent collection explicitly.
  // Automator ships no static scripting definition, so the check skips it and
  // its two entries document the defect without being verified here.
  'automator: app["workflowNames"]': 'https://github.com/mike-north/macts/issues/165',
  'automator: app["actions"]': 'https://github.com/mike-north/macts/issues/165',
  'xcode: app["workspaceNames"]': 'https://github.com/mike-north/macts/issues/165',
  'microsoft-edge: app["folders"]': 'https://github.com/mike-north/macts/issues/165',
}

/** The top-level collection accessors one app's bodies address, with an operation using each. */
interface AppAccessors {
  readonly app: string
  readonly bundleId: string
  readonly accessors: ReadonlyMap<string, string>
}

/**
 * Every `app["<name>"]` in a body, with the text that follows it. A collection
 * is followed by a member access (`.byId(`, `.whose(`, `.push(`) or read whole
 * with `()`. A command is called and a class is constructed with `(`, so `()`
 * names a collection only when the name is not one of the app's commands.
 */
const APP_MEMBER = /app\[("(?:[^"\\]|\\.)*")\](\.|\(\)|\()/g

/** The top-level collection accessors one body addresses. */
function topLevelAccessors(body: string, commandNames: ReadonlySet<string>): string[] {
  const accessors: string[] = []
  for (const [, quoted, next] of body.matchAll(APP_MEMBER)) {
    const name = JSON.parse(quoted ?? '""') as string
    if (next === '.' || (next === '()' && !commandNames.has(name))) accessors.push(name)
  }
  return accessors
}

async function collectAccessors(): Promise<AppAccessors[]> {
  const apps = readdirSync(MANIFESTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(`${MANIFESTS_DIR}${entry.name}/app.yaml`))
    .map((entry) => entry.name)
  const result: AppAccessors[] = []
  for (const app of apps) {
    const manifest = await loadManifest(`${MANIFESTS_DIR}${app}/app.yaml`)
    const commandNames = new Set(Object.values(manifest.commands).map((command) => command.name))
    const accessors = new Map<string, string>()
    for (const route of resolveManifestRoutes(manifest)) {
      const target: OperationTarget = {
        command: route.commandKey,
        ...(route.resourceType === undefined ? {} : { resource: route.resourceType }),
      }
      for (const accessor of topLevelAccessors(buildNativeBody(manifest, target), commandNames)) {
        if (!accessors.has(accessor)) accessors.set(accessor, route.route)
      }
    }
    if (accessors.size > 0) result.push({ app, bundleId: manifest.app.bundleId, accessors })
  }
  return result
}

/**
 * Apps that come with every macOS install, by manifest directory, that ship a
 * static scripting definition and whose bodies address at least one top-level
 * collection. Each must be checked wherever the suite runs: one that cannot be
 * checked fails the suite rather than shrinking it. (Other system apps with
 * manifests either address no top-level collection, such as Finder, Mail and
 * Screen Sharing, or ship no static definition, such as TextEdit.)
 */
const REQUIRED_CHECKED: readonly string[] = [
  'calendar',
  'notes',
  'photos',
  'reminders',
  'shortcuts',
  'terminal',
]

/** How long one app's check may take before it counts as not answering. */
const CHECK_TIMEOUT_MS = 8000

/** The result of checking one app's accessors. */
type AppCheck =
  | { readonly status: 'absent' }
  | { readonly status: 'skipped'; readonly reason: string }
  | { readonly status: 'unanswered'; readonly reason: string }
  | {
      readonly status: 'checked'
      readonly resolved: Readonly<Record<string, boolean>>
      readonly launched: boolean
    }

/**
 * The automation script that checks `accessors` on the app `bundleId`,
 * printing an {@link AppCheck} (without the `unanswered` case) as JSON.
 */
function checkScript(bundleId: string, accessors: readonly string[]): string {
  return [
    "ObjC.import('AppKit');",
    `var id = ${JSON.stringify(bundleId)};`,
    `var names = ${JSON.stringify(accessors)};`,
    'function staticDefinition(bundle) {',
    "  var name = bundle.objectForInfoDictionaryKey('OSAScriptingDefinition');",
    '  if (name.isNil()) return false;',
    "  var path = bundle.resourcePath.js + '/' + name.js;",
    '  var files = $.NSFileManager.defaultManager;',
    "  return files.fileExistsAtPath(path) || files.fileExistsAtPath(path + '.sdef');",
    '}',
    'function launchedSince(start) {',
    '  $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.2));',
    '  var apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier(id);',
    '  for (var i = 0; i < apps.count; i++) {',
    '    var launch = apps.objectAtIndex(i).launchDate;',
    '    if (!launch.isNil() && launch.timeIntervalSinceDate(start) >= 0) return true;',
    '  }',
    '  return false;',
    '}',
    'var url = $.NSWorkspace.sharedWorkspace.URLForApplicationWithBundleIdentifier(id);',
    'var out;',
    'if (url.isNil()) {',
    "  out = { status: 'absent' };",
    '} else if (!staticDefinition($.NSBundle.bundleWithURL(url))) {',
    "  out = { status: 'skipped', reason: 'no static scripting definition; resolving its terms launches it' };",
    '} else {',
    // `running()` asks Launch Services directly and launches nothing.
    '  var app = Application(id);',
    '  var start = $.NSDate.date;',
    '  var before = app.running();',
    '  var resolved = {};',
    '  names.forEach(function (name) { resolved[name] = ObjectSpecifier.hasInstance(app[name]); });',
    '  if (!before) delay(0.5);',
    '  var launched = !before && app.running() && launchedSince(start);',
    "  out = { status: 'checked', resolved: resolved, launched: launched };",
    '}',
    'JSON.stringify(out);',
  ].join('\n')
}

/** Check one app's accessors in its own `osascript` process, within {@link CHECK_TIMEOUT_MS}. */
function checkApp(bundleId: string, accessors: readonly string[]): AppCheck {
  try {
    const stdout = execFileSync('osascript', ['-l', 'JavaScript'], {
      input: checkScript(bundleId, accessors),
      encoding: 'utf8',
      timeout: CHECK_TIMEOUT_MS,
      killSignal: 'SIGKILL',
    })
    return JSON.parse(stdout) as AppCheck
  } catch (error) {
    const timedOut = (error as NodeJS.ErrnoException).code === 'ETIMEDOUT'
    const reason = timedOut
      ? `no answer within ${String(CHECK_TIMEOUT_MS / 1000)}s`
      : `osascript failed: ${
          String((error as { stderr?: unknown }).stderr ?? error)
            .trim()
            .split('\n')[0] ?? ''
        }`
    return { status: 'unanswered', reason }
  }
}

// Runs everywhere: the check below is only as wide as the accessors collected.
describe('collecting the top-level accessors bodies address', () => {
  let apps: AppAccessors[]
  beforeAll(async () => {
    apps = await collectAccessors()
  })
  const accessorsOf = (app: string): string[] => [
    ...(apps.find((entry) => entry.app === app)?.accessors.keys() ?? []),
  ]

  it('collects a parent spelled from an identifier parameter, not only route resources', () => {
    // Automator's variables live under a workflow named by `workflowNameId`,
    // which names no resource; the body addresses app["workflowNames"].
    expect(accessorsOf('automator')).toEqual(expect.arrayContaining(['workflowNames']))
    expect(accessorsOf('xcode')).toEqual(expect.arrayContaining(['workspaceNames']))
    expect(accessorsOf('microsoft-edge')).toEqual(expect.arrayContaining(['folders']))
  })

  it('collects a parent matched to a resource, and a resource read whole', () => {
    expect(accessorsOf('calendar')).toEqual(expect.arrayContaining(['calendars']))
    expect(accessorsOf('photos')).toEqual(expect.arrayContaining(['mediaItems']))
  })

  it('collects accessors for every app that must be checked on macOS', () => {
    for (const app of REQUIRED_CHECKED) expect(accessorsOf(app), app).not.toEqual([])
  })

  it('addresses no resource marked unsupported', () => {
    // Screen Sharing's connections and Console's devices have no class in
    // their apps' dictionaries, and Finder's desktop and trash objects are
    // elements of nothing; each manifest marks the resource unsupported, so
    // no route, and no body, reaches it.
    expect(accessorsOf('screen-sharing')).not.toContain('connections')
    expect(accessorsOf('console')).not.toContain('devices')
    expect(accessorsOf('finder')).not.toContain('desktopObjects')
    expect(accessorsOf('finder')).not.toContain('trashObjects')
  })

  it('addresses nothing only a command marked unsupported reaches', () => {
    // Automator's getSetting and getRequiredResource look an item up at the
    // application, so their bodies address app["settings"] and
    // app["requiredResources"]; Automator has neither there (a live read
    // raises -1728), so the manifest marks both commands, and no route, and
    // no body, reaches either collection. Settings and required resources stay
    // reachable through an action (app["actions"]).
    expect(accessorsOf('automator')).not.toContain('settings')
    expect(accessorsOf('automator')).not.toContain('requiredResources')
    expect(accessorsOf('automator')).toEqual(expect.arrayContaining(['actions']))
  })

  it('skips command calls and class constructors', () => {
    const commandNames = new Set(['reload', 'close'])
    const body = [
      'var a = app["reload"]();',
      'var b = app["close"](params);',
      'var item = app["Note"](props);',
      'var items = app["notes"]();',
      'var one = app["folders"].byId(parentId);',
    ].join('\n')
    expect(topLevelAccessors(body, commandNames)).toEqual(['notes', 'folders'])
  })
})

describe.skipIf(process.platform !== 'darwin')(
  'collection accessors resolve in the installed apps’ dictionaries',
  () => {
    let apps: AppAccessors[]
    beforeAll(async () => {
      apps = await collectAccessors()
    })

    it('every top-level accessor a body addresses names a collection of the app', () => {
      const unresolved: string[] = []
      const expectedUnresolved: string[] = []
      const resolvedKnown: string[] = []
      const checkedApps: string[] = []
      const launched: string[] = []
      const report: string[] = []
      for (const { app, bundleId, accessors } of apps) {
        const result = checkApp(bundleId, [...accessors.keys()])
        if (result.status !== 'checked') {
          report.push(`${result.status}: ${app}${'reason' in result ? ` (${result.reason})` : ''}`)
          continue
        }
        checkedApps.push(app)
        if (result.launched) launched.push(app)
        for (const [accessor, route] of accessors) {
          const key = `${app}: app["${accessor}"]`
          if (key in KNOWN_UNRESOLVED) expectedUnresolved.push(key)
          if (result.resolved[accessor] !== true) unresolved.push(key)
          else if (key in KNOWN_UNRESOLVED) resolvedKnown.push(`${key} (${route})`)
        }
      }
      console.info([`checked: ${checkedApps.join(', ')}`, ...report].join('\n'))

      expect(launched, 'the check launched these apps').toEqual([])
      expect(
        REQUIRED_CHECKED.filter((app) => !checkedApps.includes(app)),
        'system apps that could not be checked'
      ).toEqual([])
      expect(unresolved).toEqual(expectedUnresolved)
      expect(resolvedKnown, 'known exceptions that now resolve').toEqual([])
      // A known entry whose app was checked but whose accessor no body
      // addresses any more is stale, and must be removed.
      const stale = Object.keys(KNOWN_UNRESOLVED).filter(
        (key) =>
          checkedApps.includes(key.slice(0, key.indexOf(':'))) && !expectedUnresolved.includes(key)
      )
      expect(stale).toEqual([])
    }, 600000)
  }
)
