/**
 * API plugin for Spotify.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Spotify.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Spotify.app automation.
 */
export const spotifyApiPlugin = {
  name: 'spotify',
  bundleId: 'com.spotify.client',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.spotify.client",
    "name": "Spotify",
    "displayName": "Spotify",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Spotify Suite",
      "description": "Spotify specific classes.",
      "code": "spfy",
      "resources": [
        "Track"
      ],
      "commands": [
        "nextTrack",
        "previousTrack",
        "playpause",
        "pause",
        "play",
        "playTrack"
      ],
      "enums": [
        "PlayerState"
      ]
    },
    {
      "name": "Standard Suite",
      "description": "Common classes and commands for most applications.",
      "code": "????",
      "resources": [],
      "commands": [],
      "enums": []
    }
  ],
  "resources": {
    "Track": {
      "name": "Track",
      "plural": "Tracks",
      "description": "The currently playing track",
      "code": "cTrk",
      "properties": {
        "name": {
          "access": "r",
          "type": "string",
          "description": "The name of the track",
          "code": "pnam",
          "optional": false
        },
        "artist": {
          "access": "r",
          "type": "string",
          "description": "The artist of the track",
          "code": "pArt",
          "optional": false
        },
        "album": {
          "access": "r",
          "type": "string",
          "description": "The album of the track",
          "code": "pAlb",
          "optional": false
        },
        "albumArtist": {
          "access": "r",
          "type": "string",
          "description": "The album artist of the track",
          "code": "pAlA",
          "optional": false
        },
        "discNumber": {
          "access": "r",
          "type": "integer",
          "description": "The disc number of the track",
          "code": "pDsN",
          "optional": false
        },
        "duration": {
          "access": "r",
          "type": "integer",
          "description": "The duration of the track in milliseconds",
          "code": "pDur",
          "optional": false
        },
        "playedCount": {
          "access": "r",
          "type": "integer",
          "description": "Number of times this track has been played",
          "code": "pPlC",
          "optional": false
        },
        "trackNumber": {
          "access": "r",
          "type": "integer",
          "description": "The track number",
          "code": "pTrN",
          "optional": false
        },
        "spotifyUrl": {
          "access": "r",
          "type": "string",
          "description": "The Spotify URL for the track",
          "code": "pSpU",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the track",
          "code": "ID  ",
          "optional": false
        },
        "artworkUrl": {
          "access": "r",
          "type": "string",
          "description": "The URL of the track artwork",
          "code": "pAru",
          "optional": false
        },
        "artwork": {
          "access": "r",
          "type": "string",
          "description": "The track artwork",
          "code": "pArt",
          "optional": false
        },
        "playerState": {
          "access": "r",
          "type": {
            "enum": "PlayerState"
          },
          "description": "The current player state",
          "code": "pPlS",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    }
  },
  "enums": {
    "PlayerState": {
      "name": "PlayerState",
      "code": "ePlS",
      "values": [
        {
          "name": "stopped",
          "value": "stopped",
          "code": "kPSS"
        },
        {
          "name": "playing",
          "value": "playing",
          "code": "kPSP"
        },
        {
          "name": "paused",
          "value": "paused",
          "code": "kPSp"
        }
      ]
    }
  },
  "hierarchy": {
    "children": {
      "currentTrack": {
        "resource": "Track",
        "access": "r",
        "description": "The currently playing track"
      }
    }
  },
  "relationships": [],
  "commands": {
    "nextTrack": {
      "name": "nextTrack",
      "description": "Skip to the next track.",
      "scope": "application",
      "parameters": [],
      "code": "Next"
    },
    "previousTrack": {
      "name": "previousTrack",
      "description": "Skip to the previous track.",
      "scope": "application",
      "parameters": [],
      "code": "Prev"
    },
    "playpause": {
      "name": "playpause",
      "description": "Toggle play/pause.",
      "scope": "application",
      "parameters": [],
      "code": "PlPs"
    },
    "pause": {
      "name": "pause",
      "description": "Pause playback.",
      "scope": "application",
      "parameters": [],
      "code": "Paus"
    },
    "play": {
      "name": "play",
      "description": "Resume playback.",
      "scope": "application",
      "parameters": [],
      "code": "Play"
    },
    "playTrack": {
      "name": "playTrack",
      "description": "Start playback of a track in the given context.",
      "scope": "application",
      "parameters": [
        {
          "name": "inContext",
          "type": "string",
          "description": "the URI of the context to play in",
          "required": false,
          "code": "cotx"
        }
      ],
      "code": "PCtx"
    }
  }
} as AppManifest,
} as const;
