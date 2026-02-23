/**
 * API plugin for Photos.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Photos.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Photos.app automation.
 */
export const photosApiPlugin = {
  name: 'photos',
  bundleId: 'com.apple.Photos',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.Photos",
    "name": "Photos",
    "displayName": "Photos",
    "tccEntitlements": [
      "photos",
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Standard Suite",
      "description": "Common classes and commands for all applications",
      "code": "????",
      "resources": [],
      "commands": [],
      "enums": []
    },
    {
      "name": "Photos Suite",
      "description": "Classes and commands for Photos",
      "code": "IPXS",
      "resources": [
        "MediaItem",
        "Container",
        "Album",
        "Folder",
        "Moment"
      ],
      "commands": [
        "import",
        "export",
        "duplicate",
        "make",
        "delete",
        "add",
        "startSlideshow",
        "stopSlideshow",
        "nextSlide",
        "previousSlide",
        "pauseSlideshow",
        "resumeSlideshow",
        "spotlight",
        "search"
      ],
      "enums": []
    }
  ],
  "resources": {
    "MediaItem": {
      "name": "MediaItem",
      "plural": "MediaItems",
      "description": "A media item, such as a photo or video",
      "code": "IPmi",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique ID of the media item",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name (title) of the media item",
          "code": "pnam",
          "optional": false
        },
        "description": {
          "access": "rw",
          "type": "string",
          "description": "A description of the media item",
          "code": "IPde",
          "optional": false
        },
        "filename": {
          "access": "r",
          "type": "string",
          "description": "The name of the file on disk",
          "code": "filn",
          "optional": false
        },
        "date": {
          "access": "rw",
          "type": "date",
          "description": "The date of the media item",
          "code": "idat",
          "optional": false
        },
        "height": {
          "access": "r",
          "type": "integer",
          "description": "The height of the media item in pixels",
          "code": "phit",
          "optional": false
        },
        "width": {
          "access": "r",
          "type": "integer",
          "description": "The width of the media item in pixels",
          "code": "pwid",
          "optional": false
        },
        "altitude": {
          "access": "r",
          "type": "number",
          "description": "The GPS altitude in meters",
          "code": "alti",
          "optional": false
        },
        "location": {
          "access": "rw",
          "type": "any",
          "description": "The GPS latitude and longitude, in an ordered list of 2 numbers or missing values",
          "code": "IPlo",
          "optional": false
        },
        "favorite": {
          "access": "rw",
          "type": "boolean",
          "description": "Whether the media item has been favorited",
          "code": "IPfv",
          "optional": false
        },
        "keywords": {
          "access": "rw",
          "type": {
            "array": "string"
          },
          "description": "A list of keywords to associate with a media item",
          "code": "IPkw",
          "optional": false
        },
        "size": {
          "access": "rw",
          "type": "integer",
          "description": "The selected media item file size",
          "code": "fsiz",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Container": {
      "name": "Container",
      "plural": "Containers",
      "description": "Base class for collections that contains other items, such as albums and folders",
      "code": "IPct",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique ID of this container",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of this container",
          "code": "pnam",
          "optional": false
        },
        "parent": {
          "access": "r",
          "type": {
            "resource": "folder"
          },
          "description": "This container's parent folder, if any",
          "code": "pare",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Album": {
      "name": "Album",
      "plural": "Albums",
      "description": "An album. A container that holds media items",
      "code": "IPal",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique ID of this album",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of this album",
          "code": "pnam",
          "optional": false
        },
        "parent": {
          "access": "r",
          "type": {
            "resource": "folder"
          },
          "description": "This album's parent folder, if any",
          "code": "pare",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Folder": {
      "name": "Folder",
      "plural": "Folders",
      "description": "A folder. A container that holds albums and other folders, but not media items",
      "code": "IPfd",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique ID of this folder",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of this folder",
          "code": "pnam",
          "optional": false
        },
        "parent": {
          "access": "r",
          "type": {
            "resource": "folder"
          },
          "description": "This folder's parent folder, if any",
          "code": "pare",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Moment": {
      "name": "Moment",
      "plural": "Moments",
      "description": "A set of media items that represents a Moment",
      "code": "IPmm",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique ID of the Moment",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "r",
          "type": "string",
          "description": "The name of the Moment",
          "code": "pnam",
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
  "enums": {},
  "hierarchy": {
    "children": {
      "albums": {
        "resource": "Album",
        "access": "r",
        "description": "All user created albums in the library",
        "children": {
          "mediaItems": {
            "resource": "MediaItem",
            "access": "r",
            "description": "The media items contained in this album"
          }
        }
      },
      "folders": {
        "resource": "Folder",
        "access": "r",
        "description": "All user created folders in the library",
        "children": {
          "containers": {
            "resource": "Container",
            "access": "r",
            "description": "The children containers contained in this folder"
          },
          "albums": {
            "resource": "Album",
            "access": "r",
            "description": "All albums contained in this folder"
          },
          "folders": {
            "resource": "Folder",
            "access": "r",
            "description": "All folders contained in this folder"
          }
        }
      },
      "containers": {
        "resource": "Container",
        "access": "r",
        "description": "Top level containers in the library, including user created albums and folders"
      },
      "mediaItems": {
        "resource": "MediaItem",
        "access": "r",
        "description": "Media items in the library"
      },
      "moments": {
        "resource": "Moment",
        "access": "r",
        "description": "Moments in the library"
      }
    }
  },
  "relationships": [],
  "commands": {
    "listMediaItems": {
      "name": "list",
      "description": "List all media items",
      "scope": "resource",
      "resourceType": "MediaItem",
      "parameters": [],
      "code": "core",
      "permission": "photos:mediaItems:list"
    },
    "getMediaItem": {
      "name": "get",
      "description": "Get a media item by ID",
      "scope": "resource",
      "resourceType": "MediaItem",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Media item identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "photos:mediaItems:get"
    },
    "listAlbums": {
      "name": "list",
      "description": "List all albums",
      "scope": "resource",
      "resourceType": "Album",
      "parameters": [],
      "code": "core",
      "permission": "photos:albums:list"
    },
    "getAlbum": {
      "name": "get",
      "description": "Get an album by ID",
      "scope": "resource",
      "resourceType": "Album",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Album identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "photos:albums:get"
    },
    "listFolders": {
      "name": "list",
      "description": "List all folders",
      "scope": "resource",
      "resourceType": "Folder",
      "parameters": [],
      "code": "core",
      "permission": "photos:folders:list"
    },
    "getFolder": {
      "name": "get",
      "description": "Get a folder by ID",
      "scope": "resource",
      "resourceType": "Folder",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Folder identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "photos:folders:get"
    },
    "import": {
      "name": "import",
      "description": "Import files into the library",
      "scope": "application",
      "parameters": [
        {
          "name": "files",
          "type": {
            "array": "string"
          },
          "description": "The list of files to copy",
          "required": true
        },
        {
          "name": "into",
          "type": "string",
          "description": "The album to import into",
          "required": false
        },
        {
          "name": "skipCheckDuplicates",
          "type": "boolean",
          "description": "Skip duplicate checking and import everything",
          "required": false
        }
      ],
      "code": "IPXS",
      "permission": "photos:import:files"
    },
    "export": {
      "name": "export",
      "description": "Export media items to the specified location as files",
      "scope": "application",
      "parameters": [
        {
          "name": "mediaItems",
          "type": {
            "array": "string"
          },
          "description": "The list of media items to export",
          "required": true
        },
        {
          "name": "to",
          "type": "string",
          "description": "The destination of the export",
          "required": true
        },
        {
          "name": "usingOriginals",
          "type": "boolean",
          "description": "Export the original files if true, otherwise export rendered jpgs",
          "required": false
        }
      ],
      "code": "IPXS",
      "permission": "photos:export:files"
    },
    "duplicate": {
      "name": "duplicate",
      "description": "Duplicate a media item",
      "scope": "resource",
      "resourceType": "MediaItem",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "The media item to duplicate",
          "required": true
        }
      ],
      "code": "IPXS",
      "permission": "photos:mediaItems:duplicate"
    },
    "make": {
      "name": "make",
      "description": "Create a new album or folder",
      "scope": "application",
      "parameters": [
        {
          "name": "new",
          "type": "string",
          "description": "The class of the new object (album or folder)",
          "required": true
        },
        {
          "name": "named",
          "type": "string",
          "description": "The name of the new object",
          "required": false
        },
        {
          "name": "at",
          "type": "string",
          "description": "The parent folder for the new object",
          "required": false
        }
      ],
      "code": "core",
      "permission": "photos:containers:create"
    },
    "delete": {
      "name": "delete",
      "description": "Delete an album or folder",
      "scope": "application",
      "parameters": [
        {
          "name": "target",
          "type": "string",
          "description": "The album or folder to delete",
          "required": true
        }
      ],
      "code": "core",
      "permission": "photos:containers:delete"
    },
    "add": {
      "name": "add",
      "description": "Add media items to an album",
      "scope": "application",
      "parameters": [
        {
          "name": "mediaItems",
          "type": {
            "array": "string"
          },
          "description": "The list of media items to add",
          "required": true
        },
        {
          "name": "to",
          "type": "string",
          "description": "The album to add to",
          "required": true
        }
      ],
      "code": "IPXS",
      "permission": "photos:albums:add"
    },
    "startSlideshow": {
      "name": "startSlideshow",
      "description": "Display an ad-hoc slide show from a list of media items",
      "scope": "application",
      "parameters": [
        {
          "name": "using",
          "type": {
            "array": "string"
          },
          "description": "The media items to show",
          "required": true
        }
      ],
      "code": "IPXS",
      "permission": "photos:slideshow:start"
    },
    "stopSlideshow": {
      "name": "stopSlideshow",
      "description": "End the currently-playing slideshow",
      "scope": "application",
      "parameters": [],
      "code": "IPXS",
      "permission": "photos:slideshow:stop"
    },
    "nextSlide": {
      "name": "nextSlide",
      "description": "Skip to next slide in currently-playing slideshow",
      "scope": "application",
      "parameters": [],
      "code": "IPXS",
      "permission": "photos:slideshow:next"
    },
    "previousSlide": {
      "name": "previousSlide",
      "description": "Skip to previous slide in currently-playing slideshow",
      "scope": "application",
      "parameters": [],
      "code": "IPXS",
      "permission": "photos:slideshow:previous"
    },
    "pauseSlideshow": {
      "name": "pauseSlideshow",
      "description": "Pause the currently-playing slideshow",
      "scope": "application",
      "parameters": [],
      "code": "IPXS",
      "permission": "photos:slideshow:pause"
    },
    "resumeSlideshow": {
      "name": "resumeSlideshow",
      "description": "Resume the currently-playing slideshow",
      "scope": "application",
      "parameters": [],
      "code": "IPXS",
      "permission": "photos:slideshow:resume"
    },
    "spotlight": {
      "name": "spotlight",
      "description": "Show the image at path in the application",
      "scope": "application",
      "parameters": [
        {
          "name": "target",
          "type": "string",
          "description": "The full path to the image or media item ID",
          "required": true
        }
      ],
      "code": "IPXS",
      "permission": "photos:app:spotlight"
    },
    "search": {
      "name": "search",
      "description": "Search for items matching the search string",
      "scope": "application",
      "parameters": [
        {
          "name": "for",
          "type": "string",
          "description": "The text to search for",
          "required": true
        }
      ],
      "code": "IPXS",
      "permission": "photos:app:search"
    }
  },
  "permissions": {
    "mediaItems": {
      "read": [
        "photos:mediaItems:list",
        "photos:mediaItems:get"
      ],
      "create": [
        "photos:import:files"
      ],
      "write": [
        "photos:mediaItems:update"
      ],
      "delete": [
        "photos:mediaItems:delete"
      ]
    },
    "albums": {
      "read": [
        "photos:albums:list",
        "photos:albums:get"
      ],
      "create": [
        "photos:containers:create"
      ],
      "write": [
        "photos:albums:update",
        "photos:albums:add"
      ],
      "delete": [
        "photos:containers:delete"
      ]
    },
    "folders": {
      "read": [
        "photos:folders:list",
        "photos:folders:get"
      ],
      "create": [
        "photos:containers:create"
      ],
      "write": [
        "photos:folders:update"
      ],
      "delete": [
        "photos:containers:delete"
      ]
    },
    "slideshow": {
      "read": [
        "photos:slideshow:start",
        "photos:slideshow:stop",
        "photos:slideshow:next",
        "photos:slideshow:previous",
        "photos:slideshow:pause",
        "photos:slideshow:resume"
      ]
    },
    "app": {
      "read": [
        "photos:app:spotlight",
        "photos:app:search"
      ]
    }
  },
  "extraction": {
    "sourceFile": "photos-sdef.xml",
    "confidence": {
      "overall": 0.95,
      "fields": {
        "resources": 1,
        "commands": 0.95,
        "hierarchy": 0.95
      }
    },
    "openQuestions": []
  }
} as AppManifest,
} as const;
