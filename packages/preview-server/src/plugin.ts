/**
 * API plugin for Preview.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Preview.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Preview.app automation.
 */
export const previewApiPlugin = {
  name: 'preview',
  bundleId: 'com.apple.Preview',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.Preview",
    "name": "Preview",
    "displayName": "Preview",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Preview Suite",
      "description": "Preview application classes",
      "code": "????",
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
      "description": "A Preview document",
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
        "access": "r",
        "description": "Open documents in Preview"
      }
    }
  },
  "relationships": [],
  "commands": {
    "list": {
      "name": "list",
      "description": "List all open documents",
      "scope": "resource",
      "resourceType": "Document",
      "parameters": [],
      "permission": "preview:documents:list"
    },
    "get": {
      "name": "get",
      "description": "Get a document by name",
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
      "permission": "preview:documents:get"
    }
  },
  "permissions": {
    "documents": {
      "read": [
        "preview:documents:list",
        "preview:documents:get"
      ]
    }
  }
} as AppManifest,
} as const;
