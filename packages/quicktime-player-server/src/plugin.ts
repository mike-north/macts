/**
 * API plugin for QuickTimePlayer.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for QuickTimePlayer.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for QuickTimePlayer.app automation.
 */
export const quickTimePlayerApiPlugin = {
  name: 'quicktimeplayer',
  bundleId: 'com.apple.QuickTimePlayerX',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.QuickTimePlayerX',
      name: 'QuickTime Player',
      displayName: 'QuickTime Player',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Internet Suite',
        description: 'Common URL related functionality',
        code: 'gurl',
        resources: [],
        commands: ['openURL'],
        enums: [],
      },
      {
        name: 'QuickTime Player Suite',
        description: 'Classes and Commands for working with QuickTime Player',
        code: 'qtpx',
        resources: ['Document'],
        commands: [
          'play',
          'start',
          'pause',
          'resume',
          'stop',
          'stepBackward',
          'stepForward',
          'trim',
          'present',
          'newMovieRecording',
          'newAudioRecording',
          'newScreenRecording',
          'export',
          'showRemoteHud',
        ],
        enums: [],
      },
    ],
    resources: {
      Document: {
        name: 'Document',
        plural: 'Documents',
        description: 'A QuickTime Player document',
        code: 'docu',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The document name',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the document',
            code: 'ID  ',
            optional: false,
          },
          path: {
            access: 'r',
            type: 'string',
            description: 'The file path of the document',
            code: 'ppth',
            optional: false,
          },
          playing: {
            access: 'rw',
            type: 'boolean',
            description: 'Whether the document is currently playing',
            code: 'play',
            optional: false,
          },
          duration: {
            access: 'r',
            type: 'number',
            description: 'The duration of the document in seconds',
            code: 'dura',
            optional: false,
          },
          currentTime: {
            access: 'rw',
            type: 'number',
            description: 'The current playback time in seconds',
            code: 'time',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
    },
    enums: {},
    hierarchy: {
      children: {
        documents: {
          resource: 'Document',
          access: 'rw',
          description: 'QuickTime Player documents',
        },
      },
    },
    relationships: [],
    commands: {
      openURL: {
        name: 'openURL',
        description: 'Open a URL.',
        scope: 'application',
        parameters: [],
        code: 'GURL',
      },
      play: {
        name: 'play',
        description: 'Play the movie.',
        scope: 'application',
        parameters: [],
        code: 'play',
      },
      start: {
        name: 'start',
        description: 'Start the movie recording.',
        scope: 'application',
        parameters: [],
        code: 'star',
      },
      pause: {
        name: 'pause',
        description: 'Pause the recording.',
        scope: 'application',
        parameters: [],
        code: 'paus',
      },
      resume: {
        name: 'resume',
        description: 'Resume the recording.',
        scope: 'application',
        parameters: [],
        code: 'resu',
      },
      stop: {
        name: 'stop',
        description: 'Stop the movie or recording.',
        scope: 'application',
        parameters: [],
        code: 'stop',
      },
      stepBackward: {
        name: 'stepBackward',
        description: 'Step the movie backward the specified number of steps (default is 1).',
        scope: 'application',
        parameters: [
          {
            name: 'by',
            type: 'integer',
            description: 'number of steps',
            required: false,
            code: 'stpc',
          },
        ],
        code: 'stba',
      },
      stepForward: {
        name: 'stepForward',
        description: 'Step the movie forward the specified number of steps (default is 1).',
        scope: 'application',
        parameters: [
          {
            name: 'by',
            type: 'integer',
            description: 'number of steps',
            required: false,
            code: 'stpc',
          },
        ],
        code: 'stfo',
      },
      trim: {
        name: 'trim',
        description: 'Trim the movie.',
        scope: 'application',
        parameters: [
          {
            name: 'from',
            type: 'number',
            description: 'start time in seconds',
            required: true,
            code: 'trfm',
          },
          {
            name: 'to',
            type: 'number',
            description: 'end time in seconds',
            required: true,
            code: 'trto',
          },
        ],
        code: 'trim',
      },
      present: {
        name: 'present',
        description: 'Present the document full screen.',
        scope: 'application',
        parameters: [],
        code: 'pres',
      },
      newMovieRecording: {
        name: 'newMovieRecording',
        description: 'Create a new movie recording document.',
        scope: 'application',
        parameters: [],
        code: 'navr',
      },
      newAudioRecording: {
        name: 'newAudioRecording',
        description: 'Create a new audio recording document.',
        scope: 'application',
        parameters: [],
        code: 'nwar',
      },
      newScreenRecording: {
        name: 'newScreenRecording',
        description: 'Create a new screen recording document.',
        scope: 'application',
        parameters: [],
        code: 'nscr',
      },
      export: {
        name: 'export',
        description: 'Export a movie to another file',
        scope: 'application',
        parameters: [
          {
            name: 'in',
            type: 'file',
            description: 'the destination file',
            required: true,
            code: 'kfil',
          },
          {
            name: 'usingSettingsPreset',
            type: 'string',
            description: 'the name of the export settings preset to use',
            required: true,
            code: 'expp',
          },
        ],
        code: 'expo',
      },
      showRemoteHud: {
        name: 'showRemoteHud',
        description: "Show the document's Remote HUD",
        scope: 'application',
        parameters: [],
        code: 'rmot',
      },
    },
  } as AppManifest,
} as const
