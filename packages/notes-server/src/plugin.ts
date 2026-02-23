/**
 * API plugin for Notes.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Notes.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Notes.app automation.
 */
export const notesApiPlugin = {
  name: 'notes',
  bundleId: 'com.apple.Notes',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.Notes",
    "name": "Notes",
    "displayName": "Notes",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Notes Suite",
      "description": "Notes application classes",
      "code": "????",
      "resources": [
        "Account",
        "Folder",
        "Note",
        "Attachment"
      ],
      "commands": [],
      "enums": []
    }
  ],
  "resources": {
    "Account": {
      "name": "Account",
      "plural": "Accounts",
      "description": "A Notes account",
      "code": "NTac",
      "properties": {
        "name": {
          "access": "r",
          "type": "string",
          "description": "The name of the account",
          "code": "pnam",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the account",
          "code": "ID  ",
          "optional": false
        },
        "upgraded": {
          "access": "r",
          "type": "boolean",
          "description": "Whether the account has been upgraded",
          "code": "upgr",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "name",
          "primary": true
        }
      ]
    },
    "Folder": {
      "name": "Folder",
      "plural": "Folders",
      "description": "A Notes folder",
      "code": "NTfo",
      "properties": {
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the folder",
          "code": "pnam",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the folder",
          "code": "ID  ",
          "optional": false
        },
        "container": {
          "access": "r",
          "type": "string",
          "description": "The container of the folder",
          "code": "NTcr",
          "optional": true
        },
        "shared": {
          "access": "r",
          "type": "boolean",
          "description": "Whether the folder is shared",
          "code": "NTsh",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "name",
          "primary": true
        }
      ]
    },
    "Note": {
      "name": "Note",
      "plural": "Notes",
      "description": "A note",
      "code": "NTno",
      "properties": {
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the note (first line)",
          "code": "pnam",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the note",
          "code": "ID  ",
          "optional": false
        },
        "body": {
          "access": "rw",
          "type": "string",
          "description": "The HTML content of the note body",
          "code": "NTbo",
          "optional": false
        },
        "plaintext": {
          "access": "r",
          "type": "string",
          "description": "The plaintext content of the note",
          "code": "NTpt",
          "optional": false
        },
        "creationDate": {
          "access": "r",
          "type": "string",
          "description": "The creation date of the note",
          "code": "NTcd",
          "optional": false
        },
        "modificationDate": {
          "access": "r",
          "type": "string",
          "description": "The modification date of the note",
          "code": "NTmd",
          "optional": false
        },
        "shared": {
          "access": "r",
          "type": "boolean",
          "description": "Whether the note is shared",
          "code": "NTsh",
          "optional": false
        },
        "passwordProtected": {
          "access": "r",
          "type": "boolean",
          "description": "Whether the note is password protected",
          "code": "NTpp",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "name",
          "primary": true
        }
      ]
    },
    "Attachment": {
      "name": "Attachment",
      "plural": "Attachments",
      "description": "A note attachment",
      "code": "NTat",
      "properties": {
        "name": {
          "access": "r",
          "type": "string",
          "description": "The name of the attachment",
          "code": "pnam",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the attachment",
          "code": "ID  ",
          "optional": false
        },
        "contentIdentifier": {
          "access": "r",
          "type": "string",
          "description": "The content identifier of the attachment",
          "code": "NTci",
          "optional": true
        },
        "creationDate": {
          "access": "r",
          "type": "string",
          "description": "The creation date of the attachment",
          "code": "NTcd",
          "optional": false
        },
        "modificationDate": {
          "access": "r",
          "type": "string",
          "description": "The modification date of the attachment",
          "code": "NTmd",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "name",
          "primary": true
        }
      ]
    }
  },
  "enums": {},
  "hierarchy": {
    "children": {
      "accounts": {
        "resource": "Account",
        "access": "r",
        "description": "Notes accounts"
      },
      "folders": {
        "resource": "Folder",
        "access": "rw",
        "description": "Notes folders"
      },
      "notes": {
        "resource": "Note",
        "access": "rw",
        "description": "All notes"
      }
    }
  },
  "relationships": [],
  "commands": {
    "list": {
      "name": "list",
      "description": "List items",
      "scope": "resource",
      "resourceType": [
        "Account",
        "Folder",
        "Note",
        "Attachment"
      ],
      "parameters": []
    },
    "get": {
      "name": "get",
      "description": "Get an item by name",
      "scope": "resource",
      "resourceType": [
        "Account",
        "Folder",
        "Note",
        "Attachment"
      ],
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Item name",
          "required": true
        }
      ]
    },
    "create": {
      "name": "create",
      "description": "Create a new note",
      "scope": "resource",
      "resourceType": "Note",
      "parameters": [
        {
          "name": "body",
          "type": "string",
          "description": "HTML content of the note",
          "required": false
        }
      ]
    },
    "show": {
      "name": "show",
      "description": "Show a note in the Notes app",
      "scope": "resource",
      "resourceType": "Note",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Note name",
          "required": true
        }
      ]
    }
  },
  "permissions": {
    "accounts": {
      "read": [
        "notes:accounts:list",
        "notes:accounts:get"
      ]
    },
    "folders": {
      "read": [
        "notes:folders:list",
        "notes:folders:get"
      ],
      "create": [
        "notes:folders:create"
      ]
    },
    "notes": {
      "read": [
        "notes:notes:list",
        "notes:notes:get"
      ],
      "create": [
        "notes:notes:create"
      ],
      "write": [
        "notes:notes:update"
      ]
    }
  }
} as AppManifest,
} as const;
