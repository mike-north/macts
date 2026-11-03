/**
 * Cross-surface coherence tests for parent-scoped `list` operations.
 *
 * A parent-scoped list (e.g. "list the tabs of a window", "list the schemes of
 * a workspace") is modeled by a list command that declares a required parameter
 * naming the parent scope (e.g. `windowId`). For that one manifest fact, FOUR
 * generated surfaces must agree, or the generated packages will not compile or
 * will silently drop the scope:
 *
 *   1. SDK `list()` signature — accepts the required parent param.
 *   2. SDK `list()` body — forwards the param in the request body.
 *   3. Capability `inputSchema` — lists the param in `properties` AND `required`.
 *   4. CLI `list` command — exposes a `--<param>` option and passes it to
 *      `list(...)`.
 *
 * The bug this guards against (issue #94): the MCP handler and CLI passed a
 * parent-scope argument that the SDK `list()` did not accept (`void <param>` +
 * a 0-arg `.list()`), so a faithful regeneration produced
 * `TS2554: Expected 0 arguments, but got 1`. The committed artifacts masked the
 * incoherence. These tests assert the surfaces agree, derived BY HAND from the
 * manifest command parameters (the spec) — not from generator output.
 *
 * A negative fixture (a sibling resource whose list command has NO required
 * params) asserts the inverse: a non-parent-scoped list must NOT gain an
 * argument on any surface — the previous "always forward the hierarchy parent"
 * behavior wrongly passed an arg there too.
 *
 * @see ../../../../manifests/calendar/app.yaml (the proven events.list(calendarId) precedent)
 * @see ./sdk/http-client.ts (generateListMethod — required-param-driven signature)
 * @see ../capabilities/operation-schema.ts (generateResourceOperationSchema — inputSchema.required)
 * @see ./cli/commands.ts (generateListCommand — CLI list args/options)
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest } from '../manifest/index.js'
import { generateHttpClientSdk } from './sdk/http-client.js'
import { generateCliPlugin } from './cli/index.js'
import { generateResourceOperationSchema } from '../capabilities/operation-schema.js'
import { RANGE_READ_SUPPORTED, UNIQUE_CLAIM } from '../manifest/test-support/unique-claim.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileContent(files: { path: string; content: string }[], path: string): string {
  const file = files.find((f) => f.path === path)
  if (!file) {
    throw new Error(
      `Expected generated file "${path}". Got: ${files.map((f) => f.path).join(', ')}`
    )
  }
  return file.content
}

/**
 * A manifest with:
 *  - Window (parent), with a plain list (no required params).
 *  - Tab (child), whose `listTabs` requires `windowId` (parent-scoped list).
 *
 * `windowId` is the spec-defined parent-scope param. The expected arg/option/
 * schema values below are written by hand from this manifest, not copied from
 * generator output.
 */
const PARENT_SCOPE_PARAM = 'windowId'

const manifest: AppManifest = {
  version: '1.0',
  app: {
    bundleId: 'com.example.browser',
    name: 'Test Browser',
    displayName: 'Test Browser',
    tccEntitlements: [],
  },
  suites: [],
  resources: {
    Window: {
      name: 'Window',
      plural: 'Windows',
      description: 'A browser window',
      properties: {
        id: { access: 'r', type: 'string', description: 'Window id', optional: false },
        name: { access: 'rw', type: 'string', description: 'Window name', optional: false },
      },
      identifiers: [{ property: 'id', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    },
    Tab: {
      name: 'Tab',
      plural: 'Tabs',
      description: 'A browser tab',
      properties: {
        id: { access: 'r', type: 'string', description: 'Tab id', optional: false },
        url: { access: 'rw', type: 'string', description: 'Tab URL', optional: false },
      },
      identifiers: [{ property: 'id', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    },
    // Regression fixture for issue #94: a resource NESTED in the hierarchy (so
    // the CLI derives a parent param from nesting) whose list command declares
    // NO required params. The CLI must NOT forward the hierarchy parent — the
    // SDK `list()` takes 0 args, and forwarding produced TS2554.
    Bookmark: {
      name: 'Bookmark',
      plural: 'Bookmarks',
      description: 'A browser bookmark',
      properties: {
        id: { access: 'r', type: 'string', description: 'Bookmark id', optional: false },
        title: { access: 'rw', type: 'string', description: 'Bookmark title', optional: false },
      },
      identifiers: [{ property: 'id', primary: true, ...UNIQUE_CLAIM }],
      ...RANGE_READ_SUPPORTED,
    },
  },
  enums: {},
  hierarchy: {
    children: {
      windows: {
        resource: 'Window',
        access: 'rw',
        children: {
          tabs: {
            resource: 'Tab',
            access: 'r',
          },
          bookmarks: {
            resource: 'Bookmark',
            access: 'r',
          },
        },
      },
    },
  },
  relationships: [],
  commands: {
    // Non-parent-scoped list (negative fixture): no required params.
    listWindows: {
      name: 'list',
      description: 'List all windows',
      scope: 'resource',
      resourceType: 'Window',
      parameters: [],
      permission: 'browser:windows:list',
    },
    // Parent-scoped list: requires windowId.
    listTabs: {
      name: 'list',
      description: 'List all tabs in a window',
      scope: 'resource',
      resourceType: 'Tab',
      parameters: [
        {
          name: PARENT_SCOPE_PARAM,
          type: 'string',
          description: 'Window identifier',
          required: true,
        },
      ],
      permission: 'browser:tabs:list',
    },
    // Nested-but-unscoped list (issue #94 CLI regression): no required params
    // despite being nested under Window in the hierarchy.
    listBookmarks: {
      name: 'list',
      description: 'List all bookmarks',
      scope: 'resource',
      resourceType: 'Bookmark',
      parameters: [],
      permission: 'browser:bookmarks:list',
    },
  },
}

// ---------------------------------------------------------------------------
// Generated artifacts (one render, shared across assertions)
// ---------------------------------------------------------------------------

const sdk = generateHttpClientSdk(manifest, { packageName: '@macts/test-browser' })
const cli = generateCliPlugin(manifest, {
  packageName: '@macts/test-browser',
  sdkPackageName: '@macts/test-browser',
})

describe('parent-scoped list: Tab.list(windowId) coherence across surfaces', () => {
  it('SDK list() signature accepts the parent-scope param', () => {
    const tabClient = fileContent(sdk.files, 'src/resources/tab.ts')
    // spec: listTabs declares a required `windowId` param
    // Tab has a primary identifier, so its list also takes the trailing page.
    expect(tabClient).toContain(
      `async list(${PARENT_SCOPE_PARAM}: string, page: { pageSize?: number; cursor?: string } = {}): Promise<{ items: Tab[]; nextCursor?: string }>`
    )
  })

  it('SDK list() forwards the parent-scope param in the request body', () => {
    const tabClient = fileContent(sdk.files, 'src/resources/tab.ts')
    // The parent scope comes last in the body, after the paging inputs.
    expect(tabClient).toContain(`, ${PARENT_SCOPE_PARAM} }`)
    // It must NOT discard the param with a void statement.
    expect(tabClient).not.toContain(`void ${PARENT_SCOPE_PARAM}`)
  })

  it('capability inputSchema lists the parent-scope param as a required property', () => {
    const tab = manifest.resources['Tab']
    const listTabs = manifest.commands['listTabs']
    if (tab === undefined || listTabs === undefined) throw new Error('fixture is missing Tab')
    const schema = generateResourceOperationSchema(listTabs, tab)
    expect(schema.properties).toHaveProperty(PARENT_SCOPE_PARAM)
    expect(schema.required).toContain(PARENT_SCOPE_PARAM)
  })

  it('CLI list command exposes a --window-id option and passes it to list()', () => {
    const cliList = fileContent(cli.files, 'src/commands/windows/tabs/list.ts')
    expect(cliList).toContain(`Option.String('--window-id'`)
    expect(cliList).toContain(`client.tabs.list(this.${PARENT_SCOPE_PARAM}, {`)
  })
})

describe('non-parent-scoped list: Window.list() takes no argument (negative)', () => {
  it('SDK list() signature takes only the page', () => {
    const windowClient = fileContent(sdk.files, 'src/resources/window.ts')
    // spec: listWindows declares NO required params
    expect(windowClient).toContain(
      'async list(page: { pageSize?: number; cursor?: string } = {}): Promise<{ items: Window[]; nextCursor?: string }>'
    )
  })

  it('CLI list command calls list() with no argument and no window-id option', () => {
    const cliList = fileContent(cli.files, 'src/commands/windows/list.ts')
    // The only argument is the page.
    expect(cliList).toContain('client.windows.list({ ...(this.pageSize')
    // Window is a top-level resource: there is no parent scope to forward, and
    // its list command declares no params, so no scope option should appear.
    expect(cliList).not.toContain('client.windows.list(this.')
  })

  it('CLI nested-but-unscoped list does NOT forward the hierarchy parent (issue #94)', () => {
    // Bookmark is nested under Window in the hierarchy, so the CLI would
    // previously forward `this.windowId` to list(). But `listBookmarks` declares
    // no params, so the SDK `list()` takes 0 args — forwarding the hierarchy
    // parent produced `TS2554: Expected 0 arguments, but got 1`.
    const cliList = fileContent(cli.files, 'src/commands/windows/bookmarks/list.ts')
    expect(cliList).toContain('client.bookmarks.list({ ...(this.pageSize')
    expect(cliList).not.toContain('client.bookmarks.list(this.')
  })
})
