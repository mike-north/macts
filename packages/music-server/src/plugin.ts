/**
 * API plugin for Music.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Music.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Music.app automation.
 */
export const musicApiPlugin = {
  name: 'music',
  bundleId: 'com.apple.Music',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.Music",
    "name": "Music",
    "displayName": "Music",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Standard Suite",
      "description": "Common terms for most applications",
      "code": "****",
      "resources": [],
      "commands": [
        "print",
        "close",
        "count",
        "delete",
        "duplicate",
        "exists",
        "make",
        "move",
        "open",
        "run",
        "quit",
        "save"
      ],
      "enums": [
        "EKnd",
        "Enum"
      ]
    },
    {
      "name": "Music Suite",
      "description": "The event suite specific to Music",
      "code": "hook",
      "resources": [
        "AirPlayDevice",
        "Artwork",
        "AudioCDPlaylist",
        "AudioCDTrack",
        "BrowserWindow",
        "Encoder",
        "EQPreset",
        "EQWindow",
        "FileTrack",
        "LibraryPlaylist",
        "MiniplayerWindow",
        "Playlist",
        "PlaylistWindow",
        "RadioTunerPlaylist",
        "SharedTrack",
        "Source",
        "SubscriptionPlaylist",
        "Track",
        "URLTrack",
        "UserPlaylist",
        "VideoWindow",
        "Visual"
      ],
      "commands": [
        "add",
        "backTrack",
        "convert",
        "download",
        "export",
        "fastForward",
        "nextTrack",
        "pause",
        "play",
        "playpause",
        "previousTrack",
        "refresh",
        "resume",
        "reveal",
        "rewind",
        "search",
        "select",
        "stop"
      ],
      "enums": [
        "EPlS",
        "ERpt",
        "EShM",
        "ESrc",
        "ESrA",
        "ESpK",
        "EMdK",
        "ERtK",
        "EAPD",
        "EClS",
        "EExF"
      ]
    },
    {
      "name": "Internet suite",
      "description": "Standard terms for Internet scripting",
      "code": "gurl",
      "resources": [],
      "commands": [
        "openLocation"
      ],
      "enums": []
    }
  ],
  "resources": {
    "AirPlayDevice": {
      "name": "AirPlayDevice",
      "plural": "AirPlayDevices",
      "description": "an AirPlay device",
      "code": "cAPD",
      "properties": {
        "active": {
          "access": "r",
          "type": "boolean",
          "description": "is the device currently being played to?",
          "code": "pAct",
          "optional": false
        },
        "available": {
          "access": "r",
          "type": "boolean",
          "description": "is the device currently available?",
          "code": "pAva",
          "optional": false
        },
        "kind": {
          "access": "r",
          "type": "string",
          "description": "the kind of the device",
          "code": "pKnd",
          "optional": false
        },
        "networkAddress": {
          "access": "r",
          "type": "string",
          "description": "the network (MAC) address of the device",
          "code": "pMAC",
          "optional": false
        },
        "protected": {
          "access": "r",
          "type": "boolean",
          "description": "is the device password- or passcode-protected?",
          "code": "pPro",
          "optional": false
        },
        "selected": {
          "access": "rw",
          "type": "boolean",
          "description": "is the device currently selected?",
          "code": "selc",
          "optional": false
        },
        "supportsAudio": {
          "access": "r",
          "type": "boolean",
          "description": "does the device support audio playback?",
          "code": "pAud",
          "optional": false
        },
        "supportsVideo": {
          "access": "r",
          "type": "boolean",
          "description": "does the device support video playback?",
          "code": "pVid",
          "optional": false
        },
        "soundVolume": {
          "access": "rw",
          "type": "integer",
          "description": "the output volume for the device (0 = minimum, 100 = maximum)",
          "code": "pVol",
          "optional": false
        }
      }
    },
    "Artwork": {
      "name": "Artwork",
      "plural": "Artworks",
      "description": "a piece of art within a track or playlist",
      "code": "cArt",
      "properties": {
        "data": {
          "access": "rw",
          "type": "string",
          "description": "data for this artwork, in the form of a picture",
          "code": "pPCT",
          "optional": false
        },
        "description": {
          "access": "rw",
          "type": "string",
          "description": "description of artwork as a string",
          "code": "pDes",
          "optional": false
        },
        "downloaded": {
          "access": "r",
          "type": "boolean",
          "description": "was this artwork downloaded by Music?",
          "code": "pDlA",
          "optional": false
        },
        "format": {
          "access": "r",
          "type": "string",
          "description": "the data format for this piece of artwork",
          "code": "pFmt",
          "optional": false
        },
        "kind": {
          "access": "rw",
          "type": "integer",
          "description": "kind or purpose of this piece of artwork",
          "code": "pKnd",
          "optional": false
        },
        "rawData": {
          "access": "rw",
          "type": "any",
          "description": "data for this artwork, in original format",
          "code": "pRaw",
          "optional": false
        }
      }
    },
    "AudioCDPlaylist": {
      "name": "AudioCDPlaylist",
      "plural": "AudioCDPlaylists",
      "description": "a playlist representing an audio CD",
      "code": "cCDP",
      "properties": {
        "artist": {
          "access": "rw",
          "type": "string",
          "description": "the artist of the CD",
          "code": "pArt",
          "optional": false
        },
        "compilation": {
          "access": "rw",
          "type": "boolean",
          "description": "is this CD a compilation album?",
          "code": "pAnt",
          "optional": false
        },
        "composer": {
          "access": "rw",
          "type": "string",
          "description": "the composer of the CD",
          "code": "pCmp",
          "optional": false
        },
        "discCount": {
          "access": "rw",
          "type": "integer",
          "description": "the total number of discs in this CD’s album",
          "code": "pDsC",
          "optional": false
        },
        "discNumber": {
          "access": "rw",
          "type": "integer",
          "description": "the index of this CD disc in the source album",
          "code": "pDsN",
          "optional": false
        },
        "genre": {
          "access": "rw",
          "type": "string",
          "description": "the genre of the CD",
          "code": "pGen",
          "optional": false
        },
        "year": {
          "access": "rw",
          "type": "integer",
          "description": "the year the album was recorded/released",
          "code": "pYr ",
          "optional": false
        }
      }
    },
    "AudioCDTrack": {
      "name": "AudioCDTrack",
      "plural": "AudioCDTracks",
      "description": "a track on an audio CD",
      "code": "cCDT",
      "properties": {
        "location": {
          "access": "r",
          "type": "file",
          "description": "the location of the file represented by this track",
          "code": "pLoc",
          "optional": false
        }
      }
    },
    "BrowserWindow": {
      "name": "BrowserWindow",
      "plural": "BrowserWindows",
      "description": "the main window",
      "code": "cBrW",
      "properties": {
        "selection": {
          "access": "r",
          "type": "string",
          "description": "the selected tracks",
          "code": "sele",
          "optional": false
        },
        "view": {
          "access": "rw",
          "type": {
            "resource": "playlist"
          },
          "description": "the playlist currently displayed in the window",
          "code": "pPly",
          "optional": false
        }
      }
    },
    "Encoder": {
      "name": "Encoder",
      "plural": "Encoders",
      "description": "converts a track to a specific file format",
      "code": "cEnc",
      "properties": {
        "format": {
          "access": "r",
          "type": "string",
          "description": "the data format created by the encoder",
          "code": "pFmt",
          "optional": false
        }
      }
    },
    "EQPreset": {
      "name": "EQPreset",
      "plural": "EQPresets",
      "description": "equalizer preset configuration",
      "code": "cEQP",
      "properties": {
        "band1": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 32 Hz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ1",
          "optional": false
        },
        "band2": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 64 Hz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ2",
          "optional": false
        },
        "band3": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 125 Hz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ3",
          "optional": false
        },
        "band4": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 250 Hz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ4",
          "optional": false
        },
        "band5": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 500 Hz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ5",
          "optional": false
        },
        "band6": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 1 kHz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ6",
          "optional": false
        },
        "band7": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 2 kHz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ7",
          "optional": false
        },
        "band8": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 4 kHz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ8",
          "optional": false
        },
        "band9": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 8 kHz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ9",
          "optional": false
        },
        "band10": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer 16 kHz band level (-12.0 dB to +12.0 dB)",
          "code": "pEQ0",
          "optional": false
        },
        "modifiable": {
          "access": "r",
          "type": "boolean",
          "description": "can this preset be modified?",
          "code": "pMod",
          "optional": false
        },
        "preamp": {
          "access": "rw",
          "type": "number",
          "description": "the equalizer preamp level (-12.0 dB to +12.0 dB)",
          "code": "pEQA",
          "optional": false
        },
        "updateTracks": {
          "access": "rw",
          "type": "boolean",
          "description": "should tracks which refer to this preset be updated when the preset is renamed or deleted?",
          "code": "pUTC",
          "optional": false
        }
      }
    },
    "EQWindow": {
      "name": "EQWindow",
      "plural": "EQWindows",
      "description": "the equalizer window",
      "code": "cEQW",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this window",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "FileTrack": {
      "name": "FileTrack",
      "plural": "FileTracks",
      "description": "a track representing an audio file (MP3, AIFF, etc.)",
      "code": "cFlT",
      "properties": {
        "location": {
          "access": "rw",
          "type": "file",
          "description": "the location of the file represented by this track",
          "code": "pLoc",
          "optional": false
        }
      }
    },
    "LibraryPlaylist": {
      "name": "LibraryPlaylist",
      "plural": "LibraryPlaylists",
      "description": "the main library playlist",
      "code": "cLiP",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this playlist",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "MiniplayerWindow": {
      "name": "MiniplayerWindow",
      "plural": "MiniplayerWindows",
      "description": "the miniplayer window",
      "code": "cMPW",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this window",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "Playlist": {
      "name": "Playlist",
      "plural": "Playlists",
      "description": "a list of tracks/streams",
      "code": "cPly",
      "properties": {
        "description": {
          "access": "rw",
          "type": "string",
          "description": "the description of the playlist",
          "code": "pDes",
          "optional": false
        },
        "disliked": {
          "access": "rw",
          "type": "boolean",
          "description": "is this playlist disliked?",
          "code": "pHat",
          "optional": false
        },
        "duration": {
          "access": "r",
          "type": "integer",
          "description": "the total length of all tracks (in seconds)",
          "code": "pDur",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "the name of the playlist",
          "code": "pnam",
          "optional": false
        },
        "favorited": {
          "access": "rw",
          "type": "boolean",
          "description": "is this playlist favorited?",
          "code": "pLov",
          "optional": false
        },
        "parent": {
          "access": "r",
          "type": {
            "resource": "playlist"
          },
          "description": "folder which contains this playlist (if any)",
          "code": "pPlP",
          "optional": false
        },
        "size": {
          "access": "r",
          "type": "integer",
          "description": "the total size of all tracks (in bytes)",
          "code": "pSiz",
          "optional": false
        },
        "specialKind": {
          "access": "r",
          "type": "string",
          "description": "special playlist kind",
          "code": "pSpK",
          "optional": false
        },
        "time": {
          "access": "r",
          "type": "string",
          "description": "the length of all tracks in MM:SS format",
          "code": "pTim",
          "optional": false
        },
        "visible": {
          "access": "r",
          "type": "boolean",
          "description": "is this playlist visible in the Source list?",
          "code": "pvis",
          "optional": false
        }
      }
    },
    "PlaylistWindow": {
      "name": "PlaylistWindow",
      "plural": "PlaylistWindows",
      "description": "a sub-window showing a single playlist",
      "code": "cPlW",
      "properties": {
        "selection": {
          "access": "r",
          "type": "string",
          "description": "the selected tracks",
          "code": "sele",
          "optional": false
        },
        "view": {
          "access": "r",
          "type": {
            "resource": "playlist"
          },
          "description": "the playlist displayed in the window",
          "code": "pPly",
          "optional": false
        }
      }
    },
    "RadioTunerPlaylist": {
      "name": "RadioTunerPlaylist",
      "plural": "RadioTunerPlaylists",
      "description": "the radio tuner playlist",
      "code": "cRTP",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this playlist",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "SharedTrack": {
      "name": "SharedTrack",
      "plural": "SharedTracks",
      "description": "a track residing in a shared library",
      "code": "cShT",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this track",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "Source": {
      "name": "Source",
      "plural": "Sources",
      "description": "a media source (library, CD, device, etc.)",
      "code": "cSrc",
      "properties": {
        "capacity": {
          "access": "r",
          "type": "number",
          "description": "the total size of the source if it has a fixed size",
          "code": "capa",
          "optional": false
        },
        "freeSpace": {
          "access": "r",
          "type": "number",
          "description": "the free space on the source if it has a fixed size",
          "code": "frsp",
          "optional": false
        },
        "kind": {
          "access": "r",
          "type": "string",
          "description": "The kind property",
          "code": "pKnd",
          "optional": false
        }
      }
    },
    "SubscriptionPlaylist": {
      "name": "SubscriptionPlaylist",
      "plural": "SubscriptionPlaylists",
      "description": "a subscription playlist from Apple Music",
      "code": "cSuP",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this playlist",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "Track": {
      "name": "Track",
      "plural": "Tracks",
      "description": "playable audio source",
      "code": "cTrk",
      "properties": {
        "album": {
          "access": "rw",
          "type": "string",
          "description": "the album name of the track",
          "code": "pAlb",
          "optional": false
        },
        "albumArtist": {
          "access": "rw",
          "type": "string",
          "description": "the album artist of the track",
          "code": "pAlA",
          "optional": false
        },
        "albumDisliked": {
          "access": "rw",
          "type": "boolean",
          "description": "is the album for this track disliked?",
          "code": "pAHt",
          "optional": false
        },
        "albumFavorited": {
          "access": "rw",
          "type": "boolean",
          "description": "is the album for this track favorited?",
          "code": "pALv",
          "optional": false
        },
        "albumRating": {
          "access": "rw",
          "type": "integer",
          "description": "the rating of the album for this track (0 to 100)",
          "code": "pAlR",
          "optional": false
        },
        "albumRatingKind": {
          "access": "r",
          "type": "string",
          "description": "the rating kind of the album rating for this track",
          "code": "pARk",
          "optional": false
        },
        "artist": {
          "access": "rw",
          "type": "string",
          "description": "the artist/source of the track",
          "code": "pArt",
          "optional": false
        },
        "bitRate": {
          "access": "r",
          "type": "integer",
          "description": "the bit rate of the track (in kbps)",
          "code": "pBRt",
          "optional": false
        },
        "bookmark": {
          "access": "rw",
          "type": "number",
          "description": "the bookmark time of the track in seconds",
          "code": "pBkt",
          "optional": false
        },
        "bookmarkable": {
          "access": "rw",
          "type": "boolean",
          "description": "is the playback position for this track remembered?",
          "code": "pBkm",
          "optional": false
        },
        "bpm": {
          "access": "rw",
          "type": "integer",
          "description": "the tempo of this track in beats per minute",
          "code": "pBPM",
          "optional": false
        },
        "category": {
          "access": "rw",
          "type": "string",
          "description": "the category of the track",
          "code": "pCat",
          "optional": false
        },
        "cloudStatus": {
          "access": "r",
          "type": "string",
          "description": "the iCloud status of the track",
          "code": "pClS",
          "optional": false
        },
        "comment": {
          "access": "rw",
          "type": "string",
          "description": "freeform notes about the track",
          "code": "pCmt",
          "optional": false
        },
        "compilation": {
          "access": "rw",
          "type": "boolean",
          "description": "is this track from a compilation album?",
          "code": "pAnt",
          "optional": false
        },
        "composer": {
          "access": "rw",
          "type": "string",
          "description": "the composer of the track",
          "code": "pCmp",
          "optional": false
        },
        "databaseID": {
          "access": "r",
          "type": "integer",
          "description": "the common, unique ID for this track. If two tracks in different playlists have the same database ID, they are sharing the same data.",
          "code": "pDID",
          "optional": false
        },
        "dateAdded": {
          "access": "r",
          "type": "date",
          "description": "the date the track was added to the playlist",
          "code": "pAdd",
          "optional": false
        },
        "description": {
          "access": "rw",
          "type": "string",
          "description": "the description of the track",
          "code": "pDes",
          "optional": false
        },
        "discCount": {
          "access": "rw",
          "type": "integer",
          "description": "the total number of discs in the source album",
          "code": "pDsC",
          "optional": false
        },
        "discNumber": {
          "access": "rw",
          "type": "integer",
          "description": "the index of the disc containing this track on the source album",
          "code": "pDsN",
          "optional": false
        },
        "disliked": {
          "access": "rw",
          "type": "boolean",
          "description": "is this track disliked?",
          "code": "pHat",
          "optional": false
        },
        "downloaderAccount": {
          "access": "r",
          "type": "string",
          "description": "the account of the person who downloaded this track",
          "code": "pDAI",
          "optional": false
        },
        "downloaderName": {
          "access": "r",
          "type": "string",
          "description": "the name of the person who downloaded this track",
          "code": "pDNm",
          "optional": false
        },
        "duration": {
          "access": "r",
          "type": "number",
          "description": "the length of the track in seconds",
          "code": "pDur",
          "optional": false
        },
        "enabled": {
          "access": "rw",
          "type": "boolean",
          "description": "is this track checked for playback?",
          "code": "enbl",
          "optional": false
        },
        "episodeID": {
          "access": "rw",
          "type": "string",
          "description": "the episode ID of the track",
          "code": "pEpD",
          "optional": false
        },
        "episodeNumber": {
          "access": "rw",
          "type": "integer",
          "description": "the episode number of the track",
          "code": "pEpN",
          "optional": false
        },
        "eQ": {
          "access": "rw",
          "type": "string",
          "description": "the name of the EQ preset of the track",
          "code": "pEQp",
          "optional": false
        },
        "finish": {
          "access": "rw",
          "type": "number",
          "description": "the stop time of the track in seconds",
          "code": "pStp",
          "optional": false
        },
        "gapless": {
          "access": "rw",
          "type": "boolean",
          "description": "is this track from a gapless album?",
          "code": "pGpl",
          "optional": false
        },
        "genre": {
          "access": "rw",
          "type": "string",
          "description": "the music/audio genre (category) of the track",
          "code": "pGen",
          "optional": false
        },
        "grouping": {
          "access": "rw",
          "type": "string",
          "description": "the grouping (piece) of the track. Generally used to denote movements within a classical work.",
          "code": "pGrp",
          "optional": false
        },
        "kind": {
          "access": "r",
          "type": "string",
          "description": "a text description of the track",
          "code": "pKnd",
          "optional": false
        },
        "longDescription": {
          "access": "rw",
          "type": "string",
          "description": "the long description of the track",
          "code": "pLds",
          "optional": false
        },
        "favorited": {
          "access": "rw",
          "type": "boolean",
          "description": "is this track favorited?",
          "code": "pLov",
          "optional": false
        },
        "lyrics": {
          "access": "rw",
          "type": "string",
          "description": "the lyrics of the track",
          "code": "pLyr",
          "optional": false
        },
        "mediaKind": {
          "access": "rw",
          "type": "string",
          "description": "the media kind of the track",
          "code": "pMdK",
          "optional": false
        },
        "modificationDate": {
          "access": "r",
          "type": "date",
          "description": "the modification date of the content of this track",
          "code": "asmo",
          "optional": false
        },
        "movement": {
          "access": "rw",
          "type": "string",
          "description": "the movement name of the track",
          "code": "pMNm",
          "optional": false
        },
        "movementCount": {
          "access": "rw",
          "type": "integer",
          "description": "the total number of movements in the work",
          "code": "pMvC",
          "optional": false
        },
        "movementNumber": {
          "access": "rw",
          "type": "integer",
          "description": "the index of the movement in the work",
          "code": "pMvN",
          "optional": false
        },
        "playedCount": {
          "access": "rw",
          "type": "integer",
          "description": "number of times this track has been played",
          "code": "pPlC",
          "optional": false
        },
        "playedDate": {
          "access": "rw",
          "type": "date",
          "description": "the date and time this track was last played",
          "code": "pPlD",
          "optional": false
        },
        "purchaserAccount": {
          "access": "r",
          "type": "string",
          "description": "the account of the person who purchased this track",
          "code": "pPAI",
          "optional": false
        },
        "purchaserName": {
          "access": "r",
          "type": "string",
          "description": "the name of the person who purchased this track",
          "code": "pPNm",
          "optional": false
        },
        "rating": {
          "access": "rw",
          "type": "integer",
          "description": "the rating of this track (0 to 100)",
          "code": "pRte",
          "optional": false
        },
        "ratingKind": {
          "access": "r",
          "type": "string",
          "description": "the rating kind of this track",
          "code": "pRtk",
          "optional": false
        },
        "releaseDate": {
          "access": "r",
          "type": "date",
          "description": "the release date of this track",
          "code": "pRlD",
          "optional": false
        },
        "sampleRate": {
          "access": "r",
          "type": "integer",
          "description": "the sample rate of the track (in Hz)",
          "code": "pSRt",
          "optional": false
        },
        "seasonNumber": {
          "access": "rw",
          "type": "integer",
          "description": "the season number of the track",
          "code": "pSeN",
          "optional": false
        },
        "shufflable": {
          "access": "rw",
          "type": "boolean",
          "description": "is this track included when shuffling?",
          "code": "pSfa",
          "optional": false
        },
        "skippedCount": {
          "access": "rw",
          "type": "integer",
          "description": "number of times this track has been skipped",
          "code": "pSkC",
          "optional": false
        },
        "skippedDate": {
          "access": "rw",
          "type": "date",
          "description": "the date and time this track was last skipped",
          "code": "pSkD",
          "optional": false
        },
        "show": {
          "access": "rw",
          "type": "string",
          "description": "the show name of the track",
          "code": "pShw",
          "optional": false
        },
        "sortAlbum": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by album",
          "code": "pSAl",
          "optional": false
        },
        "sortArtist": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by artist",
          "code": "pSAr",
          "optional": false
        },
        "sortAlbumArtist": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by album artist",
          "code": "pSAA",
          "optional": false
        },
        "sortName": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by name",
          "code": "pSNm",
          "optional": false
        },
        "sortComposer": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by composer",
          "code": "pSCm",
          "optional": false
        },
        "sortShow": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by show name",
          "code": "pSSN",
          "optional": false
        },
        "size": {
          "access": "r",
          "type": "number",
          "description": "the size of the track (in bytes)",
          "code": "pSiz",
          "optional": false
        },
        "start": {
          "access": "rw",
          "type": "number",
          "description": "the start time of the track in seconds",
          "code": "pStr",
          "optional": false
        },
        "time": {
          "access": "r",
          "type": "string",
          "description": "the length of the track in MM:SS format",
          "code": "pTim",
          "optional": false
        },
        "trackCount": {
          "access": "rw",
          "type": "integer",
          "description": "the total number of tracks on the source album",
          "code": "pTrC",
          "optional": false
        },
        "trackNumber": {
          "access": "rw",
          "type": "integer",
          "description": "the index of the track on the source album",
          "code": "pTrN",
          "optional": false
        },
        "unplayed": {
          "access": "rw",
          "type": "boolean",
          "description": "is this track unplayed?",
          "code": "pUnp",
          "optional": false
        },
        "volumeAdjustment": {
          "access": "rw",
          "type": "integer",
          "description": "relative volume adjustment of the track (-100% to 100%)",
          "code": "pAdj",
          "optional": false
        },
        "work": {
          "access": "rw",
          "type": "string",
          "description": "the work name of the track",
          "code": "pWrk",
          "optional": false
        },
        "year": {
          "access": "rw",
          "type": "integer",
          "description": "the year the track was recorded/released",
          "code": "pYr ",
          "optional": false
        }
      }
    },
    "URLTrack": {
      "name": "URLTrack",
      "plural": "URLTracks",
      "description": "a track representing a network stream",
      "code": "cURT",
      "properties": {
        "address": {
          "access": "rw",
          "type": "string",
          "description": "the URL for this track",
          "code": "pURL",
          "optional": false
        }
      }
    },
    "UserPlaylist": {
      "name": "UserPlaylist",
      "plural": "UserPlaylists",
      "description": "custom playlists created by the user",
      "code": "cUsP",
      "properties": {
        "shared": {
          "access": "rw",
          "type": "boolean",
          "description": "is this playlist shared?",
          "code": "pShr",
          "optional": false
        },
        "smart": {
          "access": "r",
          "type": "boolean",
          "description": "is this a Smart Playlist?",
          "code": "pSmt",
          "optional": false
        },
        "genius": {
          "access": "r",
          "type": "boolean",
          "description": "is this a Genius Playlist?",
          "code": "pGns",
          "optional": false
        }
      }
    },
    "VideoWindow": {
      "name": "VideoWindow",
      "plural": "VideoWindows",
      "description": "the video window",
      "code": "cNPW",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this window",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "Visual": {
      "name": "Visual",
      "plural": "Visuals",
      "description": "a visual plug-in",
      "code": "cVis",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this visual",
          "code": "ID  ",
          "optional": false
        }
      }
    }
  },
  "enums": {
    "EKnd": {
      "name": "EKnd",
      "code": "eKnd",
      "values": [
        {
          "name": "trackListing",
          "value": "trackListing",
          "description": "a basic listing of tracks within a playlist",
          "code": "kTrk"
        },
        {
          "name": "albumListing",
          "value": "albumListing",
          "description": "a listing of a playlist grouped by album",
          "code": "kAlb"
        },
        {
          "name": "cdInsert",
          "value": "cdInsert",
          "description": "a printout of the playlist for jewel case inserts",
          "code": "kCDi"
        }
      ]
    },
    "Enum": {
      "name": "Enum",
      "code": "enum",
      "values": [
        {
          "name": "standard",
          "value": "standard",
          "description": "Standard PostScript error handling",
          "code": "lwst"
        },
        {
          "name": "detailed",
          "value": "detailed",
          "description": "print a detailed report of PostScript errors",
          "code": "lwdt"
        }
      ]
    },
    "EPlS": {
      "name": "EPlS",
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
        },
        {
          "name": "fastForwarding",
          "value": "fastForwarding",
          "code": "kPSF"
        },
        {
          "name": "rewinding",
          "value": "rewinding",
          "code": "kPSR"
        }
      ]
    },
    "ERpt": {
      "name": "ERpt",
      "code": "eRpt",
      "values": [
        {
          "name": "off",
          "value": "off",
          "code": "kRpO"
        },
        {
          "name": "one",
          "value": "one",
          "code": "kRp1"
        },
        {
          "name": "all",
          "value": "all",
          "code": "kAll"
        }
      ]
    },
    "EShM": {
      "name": "EShM",
      "code": "eShM",
      "values": [
        {
          "name": "songs",
          "value": "songs",
          "code": "kShS"
        },
        {
          "name": "albums",
          "value": "albums",
          "code": "kShA"
        },
        {
          "name": "groupings",
          "value": "groupings",
          "code": "kShG"
        }
      ]
    },
    "ESrc": {
      "name": "ESrc",
      "code": "eSrc",
      "values": [
        {
          "name": "library",
          "value": "library",
          "code": "kLib"
        },
        {
          "name": "audioCD",
          "value": "audioCD",
          "code": "kACD"
        },
        {
          "name": "mP3CD",
          "value": 3,
          "code": "kMCD"
        },
        {
          "name": "radioTuner",
          "value": "radioTuner",
          "code": "kTun"
        },
        {
          "name": "sharedLibrary",
          "value": "sharedLibrary",
          "code": "kShd"
        },
        {
          "name": "iTunesStore",
          "value": "iTunesStore",
          "code": "kITS"
        },
        {
          "name": "unknown",
          "value": "unknown",
          "code": "kUnk"
        }
      ]
    },
    "ESrA": {
      "name": "ESrA",
      "code": "eSrA",
      "values": [
        {
          "name": "albums",
          "value": "albums",
          "description": "albums only",
          "code": "kSrL"
        },
        {
          "name": "all",
          "value": "all",
          "description": "all text fields",
          "code": "kAll"
        },
        {
          "name": "artists",
          "value": "artists",
          "description": "artists only",
          "code": "kSrR"
        },
        {
          "name": "composers",
          "value": "composers",
          "description": "composers only",
          "code": "kSrC"
        },
        {
          "name": "displayed",
          "value": "displayed",
          "description": "visible text fields",
          "code": "kSrV"
        },
        {
          "name": "names",
          "value": "names",
          "description": "track names only",
          "code": "kSrS"
        }
      ]
    },
    "ESpK": {
      "name": "ESpK",
      "code": "eSpK",
      "values": [
        {
          "name": "none",
          "value": "none",
          "code": "kNon"
        },
        {
          "name": "folder",
          "value": "folder",
          "code": "kSpF"
        },
        {
          "name": "genius",
          "value": "genius",
          "code": "kSpG"
        },
        {
          "name": "library",
          "value": "library",
          "code": "kSpL"
        },
        {
          "name": "music",
          "value": "music",
          "code": "kSpZ"
        },
        {
          "name": "purchasedMusic",
          "value": "purchasedMusic",
          "code": "kSpM"
        }
      ]
    },
    "EMdK": {
      "name": "EMdK",
      "code": "eMdK",
      "values": [
        {
          "name": "song",
          "value": "song",
          "description": "music track",
          "code": "kMdS"
        },
        {
          "name": "musicVideo",
          "value": "musicVideo",
          "description": "music video track",
          "code": "kVdV"
        },
        {
          "name": "movie",
          "value": "movie",
          "description": "movie track",
          "code": "kVdM"
        },
        {
          "name": "tVShow",
          "value": "tVShow",
          "description": "TV show track",
          "code": "kVdT"
        },
        {
          "name": "unknown",
          "value": "unknown",
          "code": "kUnk"
        }
      ]
    },
    "ERtK": {
      "name": "ERtK",
      "code": "eRtK",
      "values": [
        {
          "name": "user",
          "value": "user",
          "description": "user-specified rating",
          "code": "kRtU"
        },
        {
          "name": "computed",
          "value": "computed",
          "description": "computed rating",
          "code": "kRtC"
        }
      ]
    },
    "EAPD": {
      "name": "EAPD",
      "code": "eAPD",
      "values": [
        {
          "name": "computer",
          "value": "computer",
          "code": "kAPC"
        },
        {
          "name": "airPortExpress",
          "value": "airPortExpress",
          "code": "kAPX"
        },
        {
          "name": "appleTV",
          "value": "appleTV",
          "code": "kAPT"
        },
        {
          "name": "airPlayDevice",
          "value": "airPlayDevice",
          "code": "kAPO"
        },
        {
          "name": "bluetoothDevice",
          "value": "bluetoothDevice",
          "code": "kAPB"
        },
        {
          "name": "homePod",
          "value": "homePod",
          "code": "kAPH"
        },
        {
          "name": "tV",
          "value": "tV",
          "code": "kAPV"
        },
        {
          "name": "unknown",
          "value": "unknown",
          "code": "kAPU"
        }
      ]
    },
    "EClS": {
      "name": "EClS",
      "code": "eClS",
      "values": [
        {
          "name": "unknown",
          "value": "unknown",
          "code": "kUnk"
        },
        {
          "name": "purchased",
          "value": "purchased",
          "code": "kPur"
        },
        {
          "name": "matched",
          "value": "matched",
          "code": "kMat"
        },
        {
          "name": "uploaded",
          "value": "uploaded",
          "code": "kUpl"
        },
        {
          "name": "ineligible",
          "value": "ineligible",
          "code": "kRej"
        },
        {
          "name": "removed",
          "value": "removed",
          "code": "kRem"
        },
        {
          "name": "error",
          "value": "error",
          "code": "kErr"
        },
        {
          "name": "duplicate",
          "value": "duplicate",
          "code": "kDup"
        },
        {
          "name": "subscription",
          "value": "subscription",
          "code": "kSub"
        },
        {
          "name": "prerelease",
          "value": "prerelease",
          "code": "kPrR"
        },
        {
          "name": "noLongerAvailable",
          "value": "noLongerAvailable",
          "code": "kRev"
        },
        {
          "name": "notUploaded",
          "value": "notUploaded",
          "code": "kUpP"
        }
      ]
    },
    "EExF": {
      "name": "EExF",
      "code": "eExF",
      "values": [
        {
          "name": "plainText",
          "value": "plainText",
          "code": "kTXT"
        },
        {
          "name": "unicodeText",
          "value": "unicodeText",
          "code": "kUCT"
        },
        {
          "name": "xML",
          "value": "xML",
          "code": "kXML"
        },
        {
          "name": "m3U",
          "value": 3,
          "code": "kM3U"
        },
        {
          "name": "m3U8",
          "value": 3,
          "code": "kM38"
        }
      ]
    }
  },
  "hierarchy": {
    "children": {
      "airPlayDevices": {
        "resource": "AirPlayDevice",
        "access": "rw",
        "description": "an AirPlay device"
      },
      "browserWindows": {
        "resource": "BrowserWindow",
        "access": "rw",
        "description": "the main window"
      },
      "encoders": {
        "resource": "Encoder",
        "access": "rw",
        "description": "converts a track to a specific file format"
      },
      "eQPresets": {
        "resource": "EQPreset",
        "access": "rw",
        "description": "equalizer preset configuration"
      },
      "eQWindows": {
        "resource": "EQWindow",
        "access": "rw",
        "description": "the equalizer window"
      },
      "miniplayerWindows": {
        "resource": "MiniplayerWindow",
        "access": "rw",
        "description": "the miniplayer window"
      },
      "playlists": {
        "resource": "Playlist",
        "access": "rw",
        "description": "a list of tracks/streams",
        "children": {
          "tracks": {
            "resource": "Track",
            "access": "rw",
            "description": "playable audio source",
            "children": {
              "artworks": {
                "resource": "Artwork",
                "access": "rw",
                "description": "a piece of art within a track or playlist"
              }
            }
          },
          "artworks": {
            "resource": "Artwork",
            "access": "rw",
            "description": "a piece of art within a track or playlist"
          }
        }
      },
      "playlistWindows": {
        "resource": "PlaylistWindow",
        "access": "rw",
        "description": "a sub-window showing a single playlist"
      },
      "sources": {
        "resource": "Source",
        "access": "rw",
        "description": "a media source (library, CD, device, etc.)",
        "children": {
          "audioCDPlaylists": {
            "resource": "AudioCDPlaylist",
            "access": "rw",
            "description": "a playlist representing an audio CD",
            "children": {
              "audioCDTracks": {
                "resource": "AudioCDTrack",
                "access": "rw",
                "description": "a track on an audio CD"
              }
            }
          },
          "libraryPlaylists": {
            "resource": "LibraryPlaylist",
            "access": "rw",
            "description": "the main library playlist",
            "children": {
              "fileTracks": {
                "resource": "FileTrack",
                "access": "rw",
                "description": "a track representing an audio file (MP3, AIFF, etc.)"
              },
              "uRLTracks": {
                "resource": "URLTrack",
                "access": "rw",
                "description": "a track representing a network stream"
              },
              "sharedTracks": {
                "resource": "SharedTrack",
                "access": "rw",
                "description": "a track residing in a shared library"
              }
            }
          },
          "playlists": {
            "resource": "Playlist",
            "access": "rw",
            "description": "a list of tracks/streams",
            "children": {
              "tracks": {
                "resource": "Track",
                "access": "rw",
                "description": "playable audio source",
                "children": {
                  "artworks": {
                    "resource": "Artwork",
                    "access": "rw",
                    "description": "a piece of art within a track or playlist"
                  }
                }
              },
              "artworks": {
                "resource": "Artwork",
                "access": "rw",
                "description": "a piece of art within a track or playlist"
              }
            }
          },
          "radioTunerPlaylists": {
            "resource": "RadioTunerPlaylist",
            "access": "rw",
            "description": "the radio tuner playlist",
            "children": {
              "uRLTracks": {
                "resource": "URLTrack",
                "access": "rw",
                "description": "a track representing a network stream"
              }
            }
          },
          "subscriptionPlaylists": {
            "resource": "SubscriptionPlaylist",
            "access": "rw",
            "description": "a subscription playlist from Apple Music",
            "children": {
              "fileTracks": {
                "resource": "FileTrack",
                "access": "rw",
                "description": "a track representing an audio file (MP3, AIFF, etc.)"
              },
              "uRLTracks": {
                "resource": "URLTrack",
                "access": "rw",
                "description": "a track representing a network stream"
              }
            }
          },
          "userPlaylists": {
            "resource": "UserPlaylist",
            "access": "rw",
            "description": "custom playlists created by the user",
            "children": {
              "fileTracks": {
                "resource": "FileTrack",
                "access": "rw",
                "description": "a track representing an audio file (MP3, AIFF, etc.)"
              },
              "uRLTracks": {
                "resource": "URLTrack",
                "access": "rw",
                "description": "a track representing a network stream"
              },
              "sharedTracks": {
                "resource": "SharedTrack",
                "access": "rw",
                "description": "a track residing in a shared library"
              }
            }
          }
        }
      },
      "tracks": {
        "resource": "Track",
        "access": "rw",
        "description": "playable audio source",
        "children": {
          "artworks": {
            "resource": "Artwork",
            "access": "rw",
            "description": "a piece of art within a track or playlist"
          }
        }
      },
      "videoWindows": {
        "resource": "VideoWindow",
        "access": "rw",
        "description": "the video window"
      },
      "visuals": {
        "resource": "Visual",
        "access": "rw",
        "description": "a visual plug-in"
      }
    }
  },
  "relationships": [],
  "commands": {
    "print": {
      "name": "print",
      "description": "Print the specified object(s)",
      "scope": "application",
      "parameters": [
        {
          "name": "printDialog",
          "type": "boolean",
          "description": "Should the application show the print dialog",
          "required": false,
          "code": "pdlg"
        },
        {
          "name": "withProperties",
          "type": "string",
          "description": "the print settings",
          "required": false,
          "code": "prdt"
        },
        {
          "name": "kind",
          "type": "string",
          "description": "the kind of printout desired",
          "required": false,
          "code": "pKnd"
        },
        {
          "name": "theme",
          "type": "string",
          "description": "name of theme to use for formatting the printout",
          "required": false,
          "code": "pThm"
        }
      ],
      "code": "pdoc"
    },
    "close": {
      "name": "close",
      "description": "Close an object",
      "scope": "application",
      "parameters": [],
      "code": "clos"
    },
    "count": {
      "name": "count",
      "description": "Return the number of elements of a particular class within an object",
      "scope": "application",
      "parameters": [
        {
          "name": "each",
          "type": "string",
          "description": "the class of the elements to be counted. Keyword 'each' is optional in AppleScript",
          "required": true,
          "code": "kocl"
        }
      ],
      "code": "cnte"
    },
    "delete": {
      "name": "delete",
      "description": "Delete an element from an object",
      "scope": "application",
      "parameters": [],
      "code": "delo"
    },
    "duplicate": {
      "name": "duplicate",
      "description": "Duplicate one or more object(s)",
      "scope": "application",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "the new location for the object(s)",
          "required": false,
          "code": "insh"
        }
      ],
      "code": "clon"
    },
    "exists": {
      "name": "exists",
      "description": "Verify if an object exists",
      "scope": "application",
      "parameters": [],
      "code": "doex"
    },
    "make": {
      "name": "make",
      "description": "Make a new element",
      "scope": "application",
      "parameters": [
        {
          "name": "new",
          "type": "string",
          "description": "the class of the new element. Keyword 'new' is optional in AppleScript",
          "required": true,
          "code": "kocl"
        },
        {
          "name": "at",
          "type": "string",
          "description": "the location at which to insert the element",
          "required": false,
          "code": "insh"
        },
        {
          "name": "withProperties",
          "type": "any",
          "description": "the initial values for the properties of the element",
          "required": false,
          "code": "prdt"
        }
      ],
      "code": "crel"
    },
    "move": {
      "name": "move",
      "description": "Move playlist(s) to a new location",
      "scope": "resource",
      "resourceType": "Playlist",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "the new location for the playlist(s)",
          "required": true,
          "code": "insh"
        }
      ],
      "code": "move"
    },
    "open": {
      "name": "open",
      "description": "Open the specified object(s)",
      "scope": "application",
      "parameters": [],
      "code": "odoc"
    },
    "run": {
      "name": "run",
      "description": "Run the application",
      "scope": "application",
      "parameters": [],
      "code": "oapp"
    },
    "quit": {
      "name": "quit",
      "description": "Quit the application",
      "scope": "application",
      "parameters": [],
      "code": "quit"
    },
    "save": {
      "name": "save",
      "description": "Save the specified object(s)",
      "scope": "application",
      "parameters": [],
      "code": "save"
    },
    "add": {
      "name": "add",
      "description": "add one or more files to a playlist",
      "scope": "application",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "the location of the added file(s)",
          "required": false,
          "code": "insh"
        }
      ],
      "code": "hAdd"
    },
    "backTrack": {
      "name": "backTrack",
      "description": "reposition to beginning of current track or go to previous track if already at start of current track",
      "scope": "application",
      "parameters": [],
      "code": "hBak"
    },
    "convert": {
      "name": "convert",
      "description": "convert one or more files or tracks",
      "scope": "application",
      "parameters": [],
      "code": "hCnv"
    },
    "download": {
      "name": "download",
      "description": "download a cloud track or playlist",
      "scope": "application",
      "parameters": [],
      "code": "hDwn"
    },
    "export": {
      "name": "export",
      "description": "export a source or playlist",
      "scope": "application",
      "parameters": [
        {
          "name": "as",
          "type": "string",
          "description": "the format to export for a playlist",
          "required": false,
          "code": "pExF"
        },
        {
          "name": "to",
          "type": "file",
          "description": "the destination of the export",
          "required": false,
          "code": "insh"
        }
      ],
      "code": "hExp"
    },
    "fastForward": {
      "name": "fastForward",
      "description": "skip forward in a playing track",
      "scope": "application",
      "parameters": [],
      "code": "hFst"
    },
    "nextTrack": {
      "name": "nextTrack",
      "description": "advance to the next track in the current playlist",
      "scope": "application",
      "parameters": [],
      "code": "hNxt"
    },
    "pause": {
      "name": "pause",
      "description": "pause playback",
      "scope": "application",
      "parameters": [],
      "code": "hPau"
    },
    "play": {
      "name": "play",
      "description": "play the current track or the specified track or file.",
      "scope": "application",
      "parameters": [
        {
          "name": "once",
          "type": "boolean",
          "description": "If true, play this track once and then stop.",
          "required": false,
          "code": "POne"
        }
      ],
      "code": "hPly"
    },
    "playpause": {
      "name": "playpause",
      "description": "toggle the playing/paused state of the current track",
      "scope": "application",
      "parameters": [],
      "code": "hPlP"
    },
    "previousTrack": {
      "name": "previousTrack",
      "description": "return to the previous track in the current playlist",
      "scope": "application",
      "parameters": [],
      "code": "hPrv"
    },
    "refresh": {
      "name": "refresh",
      "description": "update file track information from the current information in the track’s file",
      "scope": "resource",
      "resourceType": "FileTrack",
      "parameters": [],
      "code": "hRfr"
    },
    "resume": {
      "name": "resume",
      "description": "disable fast forward/rewind and resume playback, if playing.",
      "scope": "application",
      "parameters": [],
      "code": "hRsu"
    },
    "reveal": {
      "name": "reveal",
      "description": "reveal and select a track or playlist",
      "scope": "application",
      "parameters": [],
      "code": "hRvl"
    },
    "rewind": {
      "name": "rewind",
      "description": "skip backwards in a playing track",
      "scope": "application",
      "parameters": [],
      "code": "hRwn"
    },
    "search": {
      "name": "search",
      "description": "search a playlist for tracks matching the search string. Identical to entering search text in the Search field.",
      "scope": "resource",
      "resourceType": "Playlist",
      "parameters": [
        {
          "name": "for",
          "type": "string",
          "description": "the search text",
          "required": true,
          "code": "pTrm"
        },
        {
          "name": "only",
          "type": "string",
          "description": "area to search (default is all)",
          "required": false,
          "code": "pAre"
        }
      ],
      "code": "hSrc"
    },
    "select": {
      "name": "select",
      "description": "select the specified object(s)",
      "scope": "application",
      "parameters": [],
      "code": "slct"
    },
    "stop": {
      "name": "stop",
      "description": "stop playback",
      "scope": "application",
      "parameters": [],
      "code": "hStp"
    },
    "openLocation": {
      "name": "openLocation",
      "description": "Opens an iTunes Store or audio stream URL",
      "scope": "application",
      "parameters": [],
      "code": "GURL"
    }
  }
} as AppManifest,
} as const;
