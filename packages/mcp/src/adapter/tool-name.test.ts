/**
 * Unit tests for MCP tool name derivation.
 *
 * Expected names are written by hand from the naming rule:
 * `macts__<app>__<resource>_<operation in snake case>`, where only the
 * operation segment changes case and runs of capitals stay one word.
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool-names
 */

import { describe, expect, it } from 'vitest'
import type { OperationId } from '@macts/contracts'
import { McpToolDerivationError } from './errors.js'
import { toolNameFor } from './tool-name.js'

describe('toolNameFor', () => {
  it.each([
    ['mail.app.getURL', 'macts__mail__app_get_url'],
    ['script-editor.app.invokeAPIExpression', 'macts__script-editor__app_invoke_api_expression'],
    ['automator.app.launchAPIScriptNamed', 'macts__automator__app_launch_api_script_named'],
    ['calendar.app.reloadCalendars', 'macts__calendar__app_reload_calendars'],
    ['calendar.events.list', 'macts__calendar__events_list'],
    // An acronym's plural stays with the acronym.
    ['safari.app.listURLs', 'macts__safari__app_list_urls'],
    ['preview.documents.exportPDFs', 'macts__preview__documents_export_pdfs'],
  ] as const)('derives %s as %s', (id, expected) => {
    expect(toolNameFor(id)).toBe(expected)
  })

  it('keeps a hyphenated app name unchanged', () => {
    expect(toolNameFor('microsoft-edge.tabs.reload')).toBe('macts__microsoft-edge__tabs_reload')
  })

  it('keeps a camelCase resource unchanged', () => {
    expect(toolNameFor('automator.automatorActions.list')).toBe(
      'macts__automator__automatorActions_list'
    )
  })

  it('treats digits as part of the preceding word', () => {
    expect(toolNameFor('music.tracks.convertToMP3')).toBe('macts__music__tracks_convert_to_mp3')
  })

  it.each(['calendar.events', 'calendar.events.list.extra', 'calendar..list', '.events.list'])(
    'refuses the malformed id %s',
    (id) => {
      // The template type admits these shapes; the derivation must not.
      expect(() => toolNameFor(id as OperationId)).toThrow(McpToolDerivationError)
    }
  )
})
