/**
 * API plugin for ScriptEditor.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for ScriptEditor.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for ScriptEditor.app automation.
 */
export const scriptEditorApiPlugin = {
  name: 'scripteditor',
  bundleId: 'com.apple.ScriptEditor2',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.ScriptEditor2",
    "name": "ScriptEditor",
    "displayName": "Script Editor",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Script Editor Suite",
      "description": "Script Editor specific classes",
      "code": "ToyS",
      "resources": [
        "Document"
      ],
      "commands": [],
      "enums": []
    }
  ],
  "resources": {
    "Document": {
      "name": "Document",
      "plural": "Documents",
      "description": "A Script Editor document",
      "code": "docu",
      "properties": {
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the document",
          "code": "pnam",
          "optional": false
        },
        "path": {
          "access": "r",
          "type": "string",
          "description": "The file path of the document",
          "code": "ppth",
          "optional": true
        },
        "contents": {
          "access": "rw",
          "type": "string",
          "description": "The source code of the script",
          "code": "pcnt",
          "optional": false
        },
        "language": {
          "access": "rw",
          "type": "string",
          "description": "The scripting language (AppleScript or JavaScript)",
          "code": "slng",
          "optional": false
        },
        "modified": {
          "access": "r",
          "type": "boolean",
          "description": "Whether the document has been modified since last save",
          "code": "imod",
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
      "documents": {
        "resource": "Document",
        "access": "rw",
        "description": "Open script documents"
      }
    }
  },
  "relationships": [],
  "commands": {
    "list": {
      "name": "list",
      "description": "List all open script documents",
      "scope": "resource",
      "resourceType": "Document",
      "parameters": [],
      "permission": "scripteditor:documents:list"
    },
    "get": {
      "name": "get",
      "description": "Get a script document by name",
      "scope": "resource",
      "resourceType": "Document",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Document name",
          "required": true
        }
      ],
      "permission": "scripteditor:documents:get"
    },
    "create": {
      "name": "create",
      "description": "Create a new script document",
      "scope": "resource",
      "resourceType": "Document",
      "parameters": [
        {
          "name": "contents",
          "type": "string",
          "description": "Initial script contents",
          "required": false
        }
      ],
      "permission": "scripteditor:documents:create"
    }
  },
  "permissions": {
    "documents": {
      "read": [
        "scripteditor:documents:list",
        "scripteditor:documents:get"
      ],
      "create": [
        "scripteditor:documents:create"
      ]
    }
  }
} as AppManifest,
} as const;
