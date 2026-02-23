/**
 * API plugin for TV.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for TV.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for TV.app automation.
 */
export const tVApiPlugin = {
  name: 'tv',
  bundleId: 'com.apple.TV',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.TV",
    "name": "TV",
    "displayName": "TV",
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
      "enums": []
    },
    {
      "name": "TV Suite",
      "description": "The event suite specific to TV",
      "code": "hook",
      "resources": [
        "Artwork",
        "BrowserWindow",
        "FileTrack",
        "LibraryPlaylist",
        "Playlist",
        "PlaylistWindow",
        "SharedTrack",
        "Source",
        "Track",
        "URLTrack",
        "UserPlaylist",
        "VideoWindow"
      ],
      "commands": [
        "add",
        "backTrack",
        "convert",
        "download",
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
        "ESrc",
        "ESrA",
        "ESpK",
        "EMdK",
        "ERtK"
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
    "Artwork": {
      "name": "Artwork",
      "plural": "Artworks",
      "description": "a piece of art within a track or playlist",
      "code": "cArt",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this artwork",
          "code": "ID  ",
          "optional": false
        },
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
          "description": "was this artwork downloaded by iTunes?",
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
    "BrowserWindow": {
      "name": "BrowserWindow",
      "plural": "BrowserWindows",
      "description": "the main window",
      "code": "cBrW",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this window",
          "code": "ID  ",
          "optional": false
        },
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
    "FileTrack": {
      "name": "FileTrack",
      "plural": "FileTracks",
      "description": "a track representing a video file",
      "code": "cFlT",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this track",
          "code": "ID  ",
          "optional": false
        },
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
    "Playlist": {
      "name": "Playlist",
      "plural": "Playlists",
      "description": "a list of tracks/streams",
      "code": "cPly",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this playlist",
          "code": "ID  ",
          "optional": false
        },
        "description": {
          "access": "rw",
          "type": "string",
          "description": "the description of the playlist",
          "code": "pDes",
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
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this window",
          "code": "ID  ",
          "optional": false
        },
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
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this source",
          "code": "ID  ",
          "optional": false
        },
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
    "Track": {
      "name": "Track",
      "plural": "Tracks",
      "description": "playable video source",
      "code": "cTrk",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this track",
          "code": "ID  ",
          "optional": false
        },
        "album": {
          "access": "rw",
          "type": "string",
          "description": "the album name of the track",
          "code": "pAlb",
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
        "category": {
          "access": "rw",
          "type": "string",
          "description": "the category of the track",
          "code": "pCat",
          "optional": false
        },
        "comment": {
          "access": "rw",
          "type": "string",
          "description": "freeform notes about the track",
          "code": "pCmt",
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
        "director": {
          "access": "rw",
          "type": "string",
          "description": "the artist/source of the track",
          "code": "pArt",
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
        "finish": {
          "access": "rw",
          "type": "number",
          "description": "the stop time of the track in seconds",
          "code": "pStp",
          "optional": false
        },
        "genre": {
          "access": "rw",
          "type": "string",
          "description": "the genre (category) of the track",
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
        "sortDirector": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by artist",
          "code": "pSAr",
          "optional": false
        },
        "sortName": {
          "access": "rw",
          "type": "string",
          "description": "override string to use for the track when sorting by name",
          "code": "pSNm",
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
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this track",
          "code": "ID  ",
          "optional": false
        },
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
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Unique identifier for this playlist",
          "code": "ID  ",
          "optional": false
        },
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
    }
  },
  "enums": {
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
          "name": "library",
          "value": "library",
          "code": "kSpL"
        },
        {
          "name": "movies",
          "value": "movies",
          "code": "kSpI"
        },
        {
          "name": "tVShows",
          "value": "tVShows",
          "code": "kSpT"
        }
      ]
    },
    "EMdK": {
      "name": "EMdK",
      "code": "eMdK",
      "values": [
        {
          "name": "homeVideo",
          "value": "homeVideo",
          "description": "home video track",
          "code": "kVdH"
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
    }
  },
  "hierarchy": {
    "children": {
      "browserWindows": {
        "resource": "BrowserWindow",
        "access": "rw",
        "description": "the main window"
      },
      "playlists": {
        "resource": "Playlist",
        "access": "rw",
        "description": "a list of tracks/streams",
        "children": {
          "tracks": {
            "resource": "Track",
            "access": "rw",
            "description": "playable video source",
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
          "libraryPlaylists": {
            "resource": "LibraryPlaylist",
            "access": "rw",
            "description": "the main library playlist",
            "children": {
              "fileTracks": {
                "resource": "FileTrack",
                "access": "rw",
                "description": "a track representing a video file"
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
                "description": "playable video source",
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
          "userPlaylists": {
            "resource": "UserPlaylist",
            "access": "rw",
            "description": "custom playlists created by the user",
            "children": {
              "fileTracks": {
                "resource": "FileTrack",
                "access": "rw",
                "description": "a track representing a video file"
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
        "description": "playable video source",
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
      }
    }
  },
  "relationships": [],
  "commands": {
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
      "code": "aevt"
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
      "code": "Add "
    },
    "backTrack": {
      "name": "backTrack",
      "description": "reposition to beginning of current track or go to previous track if already at start of current track",
      "scope": "application",
      "parameters": [],
      "code": "Back"
    },
    "convert": {
      "name": "convert",
      "description": "convert one or more files or tracks",
      "scope": "application",
      "parameters": [],
      "code": "Conv"
    },
    "download": {
      "name": "download",
      "description": "download a cloud track or playlist",
      "scope": "application",
      "parameters": [],
      "code": "Dwnl"
    },
    "fastForward": {
      "name": "fastForward",
      "description": "skip forward in a playing track",
      "scope": "application",
      "parameters": [],
      "code": "Fast"
    },
    "nextTrack": {
      "name": "nextTrack",
      "description": "advance to the next track in the current playlist",
      "scope": "application",
      "parameters": [],
      "code": "Next"
    },
    "pause": {
      "name": "pause",
      "description": "pause playback",
      "scope": "application",
      "parameters": [],
      "code": "Paus"
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
      "code": "Play"
    },
    "playpause": {
      "name": "playpause",
      "description": "toggle the playing/paused state of the current track",
      "scope": "application",
      "parameters": [],
      "code": "PlPs"
    },
    "previousTrack": {
      "name": "previousTrack",
      "description": "return to the previous track in the current playlist",
      "scope": "application",
      "parameters": [],
      "code": "Prev"
    },
    "refresh": {
      "name": "refresh",
      "description": "update file track information from the current information in the track’s file",
      "scope": "resource",
      "resourceType": "FileTrack",
      "parameters": [],
      "code": "Rfrs"
    },
    "resume": {
      "name": "resume",
      "description": "disable fast forward/rewind and resume playback, if playing.",
      "scope": "application",
      "parameters": [],
      "code": "Resu"
    },
    "reveal": {
      "name": "reveal",
      "description": "reveal and select a track or playlist",
      "scope": "application",
      "parameters": [],
      "code": "Revl"
    },
    "rewind": {
      "name": "rewind",
      "description": "skip backwards in a playing track",
      "scope": "application",
      "parameters": [],
      "code": "Rwnd"
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
      "code": "Srch"
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
      "code": "Stop"
    },
    "openLocation": {
      "name": "openLocation",
      "description": "Opens an iTunes Store or stream URL",
      "scope": "application",
      "parameters": [],
      "code": "GURL"
    }
  }
} as AppManifest,
} as const;
