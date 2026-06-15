/**
 * MCP tools for Music.app app operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp'
import { getClient } from '../sdk.js'

/**
 * Print the specified object(s)
 */
export const appPrintTool: McpToolDefinition = {
  name: 'macts__music__app_print',
  description: 'Print the specified object(s)',
  inputSchema: {
    type: 'object',
    properties: {
      printDialog: {
        description: 'Should the application show the print dialog',
        type: 'boolean',
      },
      withProperties: {
        description: 'the print settings',
        type: 'string',
      },
      kind: {
        description: 'the kind of printout desired',
        type: 'string',
      },
      theme: {
        description: 'name of theme to use for formatting the printout',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { printDialog, withProperties, kind, theme } = args as {
      printDialog?: boolean
      withProperties?: string
      kind?: string
      theme?: string
    }
    const client = getClient()
    await client.print(
      printDialog as unknown as Parameters<typeof client.print>[0],
      withProperties as unknown as Parameters<typeof client.print>[1],
      kind as unknown as Parameters<typeof client.print>[2],
      theme as unknown as Parameters<typeof client.print>[3]
    )
    return { success: true }
  },
}

/**
 * Close an object
 */
export const appCloseTool: McpToolDefinition = {
  name: 'macts__music__app_close',
  description: 'Close an object',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.close()
    return { success: true }
  },
}

/**
 * Return the number of elements of a particular class within an object
 */
export const appCountTool: McpToolDefinition = {
  name: 'macts__music__app_count',
  description: 'Return the number of elements of a particular class within an object',
  inputSchema: {
    type: 'object',
    properties: {
      each: {
        description:
          "the class of the elements to be counted. Keyword 'each' is optional in AppleScript",
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['each'],
  },
  handler: async (args) => {
    const { each } = args as { each: string }
    const client = getClient()
    await client.count(each as unknown as Parameters<typeof client.count>[0])
    return { success: true }
  },
}

/**
 * Delete an element from an object
 */
export const appDeleteTool: McpToolDefinition = {
  name: 'macts__music__app_delete',
  description: 'Delete an element from an object',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client._delete()
    return { success: true }
  },
}

/**
 * Duplicate one or more object(s)
 */
export const appDuplicateTool: McpToolDefinition = {
  name: 'macts__music__app_duplicate',
  description: 'Duplicate one or more object(s)',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'the new location for the object(s)',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { to } = args as { to?: string }
    const client = getClient()
    await client.duplicate(to as unknown as Parameters<typeof client.duplicate>[0])
    return { success: true }
  },
}

/**
 * Verify if an object exists
 */
export const appExistsTool: McpToolDefinition = {
  name: 'macts__music__app_exists',
  description: 'Verify if an object exists',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.exists()
    return { success: true }
  },
}

/**
 * Make a new element
 */
export const appMakeTool: McpToolDefinition = {
  name: 'macts__music__app_make',
  description: 'Make a new element',
  inputSchema: {
    type: 'object',
    properties: {
      new: {
        description: "the class of the new element. Keyword 'new' is optional in AppleScript",
        type: 'string',
      },
      at: {
        description: 'the location at which to insert the element',
        type: 'string',
      },
      withProperties: {
        description: 'the initial values for the properties of the element',
        type: 'string',
      },
    },
    additionalProperties: false,
    required: ['new'],
  },
  handler: async (args) => {
    const {
      new: _new,
      at,
      withProperties,
    } = args as { new: string; at?: string; withProperties?: string }
    const client = getClient()
    await client.make(
      _new as unknown as Parameters<typeof client.make>[0],
      at as unknown as Parameters<typeof client.make>[1],
      withProperties as unknown as Parameters<typeof client.make>[2]
    )
    return { success: true }
  },
}

/**
 * Open the specified object(s)
 */
export const appOpenTool: McpToolDefinition = {
  name: 'macts__music__app_open',
  description: 'Open the specified object(s)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.open()
    return { success: true }
  },
}

/**
 * Run the application
 */
export const appRunTool: McpToolDefinition = {
  name: 'macts__music__app_run',
  description: 'Run the application',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.run()
    return { success: true }
  },
}

/**
 * Quit the application
 */
export const appQuitTool: McpToolDefinition = {
  name: 'macts__music__app_quit',
  description: 'Quit the application',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.quit()
    return { success: true }
  },
}

/**
 * Save the specified object(s)
 */
export const appSaveTool: McpToolDefinition = {
  name: 'macts__music__app_save',
  description: 'Save the specified object(s)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.save()
    return { success: true }
  },
}

/**
 * add one or more files to a playlist
 */
export const appAddTool: McpToolDefinition = {
  name: 'macts__music__app_add',
  description: 'add one or more files to a playlist',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        description: 'the location of the added file(s)',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { to } = args as { to?: string }
    const client = getClient()
    await client.add(to as unknown as Parameters<typeof client.add>[0])
    return { success: true }
  },
}

/**
 * reposition to beginning of current track or go to previous track if already at start of current track
 */
export const appBackTrackTool: McpToolDefinition = {
  name: 'macts__music__app_back_track',
  description:
    'reposition to beginning of current track or go to previous track if already at start of current track',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.backTrack()
    return { success: true }
  },
}

/**
 * convert one or more files or tracks
 */
export const appConvertTool: McpToolDefinition = {
  name: 'macts__music__app_convert',
  description: 'convert one or more files or tracks',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.convert()
    return { success: true }
  },
}

/**
 * download a cloud track or playlist
 */
export const appDownloadTool: McpToolDefinition = {
  name: 'macts__music__app_download',
  description: 'download a cloud track or playlist',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.download()
    return { success: true }
  },
}

/**
 * export a source or playlist
 */
export const appExportTool: McpToolDefinition = {
  name: 'macts__music__app_export',
  description: 'export a source or playlist',
  inputSchema: {
    type: 'object',
    properties: {
      as: {
        description: 'the format to export for a playlist',
        type: 'string',
      },
      to: {
        description: 'the destination of the export',
        type: 'string',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { as, to } = args as { as?: string; to?: string }
    const client = getClient()
    await client._export(
      as as unknown as Parameters<typeof client._export>[0],
      to as unknown as Parameters<typeof client._export>[1]
    )
    return { success: true }
  },
}

/**
 * skip forward in a playing track
 */
export const appFastForwardTool: McpToolDefinition = {
  name: 'macts__music__app_fast_forward',
  description: 'skip forward in a playing track',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.fastForward()
    return { success: true }
  },
}

/**
 * advance to the next track in the current playlist
 */
export const appNextTrackTool: McpToolDefinition = {
  name: 'macts__music__app_next_track',
  description: 'advance to the next track in the current playlist',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.nextTrack()
    return { success: true }
  },
}

/**
 * pause playback
 */
export const appPauseTool: McpToolDefinition = {
  name: 'macts__music__app_pause',
  description: 'pause playback',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.pause()
    return { success: true }
  },
}

/**
 * play the current track or the specified track or file.
 */
export const appPlayTool: McpToolDefinition = {
  name: 'macts__music__app_play',
  description: 'play the current track or the specified track or file.',
  inputSchema: {
    type: 'object',
    properties: {
      once: {
        description: 'If true, play this track once and then stop.',
        type: 'boolean',
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const { once } = args as { once?: boolean }
    const client = getClient()
    await client.play(once as unknown as Parameters<typeof client.play>[0])
    return { success: true }
  },
}

/**
 * toggle the playing/paused state of the current track
 */
export const appPlaypauseTool: McpToolDefinition = {
  name: 'macts__music__app_playpause',
  description: 'toggle the playing/paused state of the current track',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.playpause()
    return { success: true }
  },
}

/**
 * return to the previous track in the current playlist
 */
export const appPreviousTrackTool: McpToolDefinition = {
  name: 'macts__music__app_previous_track',
  description: 'return to the previous track in the current playlist',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.previousTrack()
    return { success: true }
  },
}

/**
 * disable fast forward/rewind and resume playback, if playing.
 */
export const appResumeTool: McpToolDefinition = {
  name: 'macts__music__app_resume',
  description: 'disable fast forward/rewind and resume playback, if playing.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.resume()
    return { success: true }
  },
}

/**
 * reveal and select a track or playlist
 */
export const appRevealTool: McpToolDefinition = {
  name: 'macts__music__app_reveal',
  description: 'reveal and select a track or playlist',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.reveal()
    return { success: true }
  },
}

/**
 * skip backwards in a playing track
 */
export const appRewindTool: McpToolDefinition = {
  name: 'macts__music__app_rewind',
  description: 'skip backwards in a playing track',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.rewind()
    return { success: true }
  },
}

/**
 * select the specified object(s)
 */
export const appSelectTool: McpToolDefinition = {
  name: 'macts__music__app_select',
  description: 'select the specified object(s)',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.select()
    return { success: true }
  },
}

/**
 * stop playback
 */
export const appStopTool: McpToolDefinition = {
  name: 'macts__music__app_stop',
  description: 'stop playback',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.stop()
    return { success: true }
  },
}

/**
 * Opens an iTunes Store or audio stream URL
 */
export const appOpenLocationTool: McpToolDefinition = {
  name: 'macts__music__app_open_location',
  description: 'Opens an iTunes Store or audio stream URL',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async () => {
    const client = getClient()
    await client.openLocation()
    return { success: true }
  },
}
