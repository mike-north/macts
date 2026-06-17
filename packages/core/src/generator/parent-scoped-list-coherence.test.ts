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
 *   3. MCP tool `inputSchema` — lists the param in `properties` AND `required`.
 *   4. MCP tool handler — destructures the param and passes it to `list(...)`.
 *   5. CLI `list` command — exposes a `--<param>` option and passes it to
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
 * @see ./mcp/index.ts (generateResourceToolHandler — list handler)
 * @see ./mcp/tools.ts (generateResourceOperationSchema — inputSchema.required)
 * @see ./cli/commands.ts (generateListCommand — CLI list args/options)
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest } from '../manifest/index.js'
import { generateHttpClientSdk } from './sdk/http-client.js'
import { generateCliPlugin } from './cli/index.js'
import { generateMcpPlugin } from './mcp/index.js'
import { createMcpGeneratorContext } from './mcp/context.js'

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
      identifiers: [{ property: 'id', primary: true }],
    },
    Tab: {
      name: 'Tab',
      plural: 'Tabs',
      description: 'A browser tab',
      properties: {
        id: { access: 'r', type: 'string', description: 'Tab id', optional: false },
        url: { access: 'rw', type: 'string', description: 'Tab URL', optional: false },
      },
      identifiers: [{ property: 'id', primary: true }],
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
      identifiers: [{ property: 'id', primary: true }],
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
const mcp = generateMcpPlugin(createMcpGeneratorContext({ appName: 'test-browser', manifest }))

describe('parent-scoped list: Tab.list(windowId) coherence across surfaces', () => {
  it('SDK list() signature accepts the parent-scope param', () => {
    const tabClient = fileContent(sdk.files, 'src/resources/tab.ts')
    // spec: listTabs declares a required `windowId` param
    expect(tabClient).toContain(`async list(${PARENT_SCOPE_PARAM}: string): Promise<Tab[]>`)
  })

  it('SDK list() forwards the parent-scope param in the request body', () => {
    const tabClient = fileContent(sdk.files, 'src/resources/tab.ts')
    expect(tabClient).toContain(`{ ${PARENT_SCOPE_PARAM} }`)
    // It must NOT discard the param with a void statement.
    expect(tabClient).not.toContain(`void ${PARENT_SCOPE_PARAM}`)
  })

  it('MCP tool inputSchema lists the parent-scope param as a required property', () => {
    const tabsTool = fileContent(mcp.files, 'src/tools/tabs.ts')
    // The inputSchema is emitted as a JSON-style object literal: the param must
    // appear under both `properties` and the `required` array.
    expect(tabsTool).toMatch(new RegExp(`"${PARENT_SCOPE_PARAM}"\\s*:\\s*\\{`))
    expect(tabsTool).toMatch(new RegExp(`"required"\\s*:\\s*\\[[^\\]]*"${PARENT_SCOPE_PARAM}"`))
  })

  it('MCP tool handler passes the parent-scope param to list()', () => {
    const tabsTool = fileContent(mcp.files, 'src/tools/tabs.ts')
    expect(tabsTool).toContain(`return client.tabs.list(${PARENT_SCOPE_PARAM})`)
    // No void-discard masking the param.
    expect(tabsTool).not.toContain(`void ${PARENT_SCOPE_PARAM}`)
    expect(tabsTool).not.toContain('client.tabs.list()')
  })

  it('CLI list command exposes a --window-id option and passes it to list()', () => {
    const cliList = fileContent(cli.files, 'src/commands/windows/tabs/list.ts')
    expect(cliList).toContain(`Option.String('--window-id'`)
    expect(cliList).toContain(`client.tabs.list(this.${PARENT_SCOPE_PARAM})`)
  })
})

describe('non-parent-scoped list: Window.list() takes no argument (negative)', () => {
  it('SDK list() signature is argument-free', () => {
    const windowClient = fileContent(sdk.files, 'src/resources/window.ts')
    // spec: listWindows declares NO required params
    expect(windowClient).toContain('async list(): Promise<Window[]>')
  })

  it('MCP tool handler calls list() with no argument', () => {
    const windowsTool = fileContent(mcp.files, 'src/tools/windows.ts')
    expect(windowsTool).toContain('client.windows.list()')
  })

  it('CLI list command calls list() with no argument and no window-id option', () => {
    const cliList = fileContent(cli.files, 'src/commands/windows/list.ts')
    expect(cliList).toContain('client.windows.list()')
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
    expect(cliList).toContain('client.bookmarks.list()')
    expect(cliList).not.toContain('client.bookmarks.list(this.')
  })
})
