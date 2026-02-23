/**
 * MCP tools for Textedit.app documents operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all open documents
 */
export const documentsListTool: McpToolDefinition = {
  name: 'macts__textedit__documents_list',
  description: 'List all open documents',
  inputSchema: {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  handler: async () => {
    const client = getClient();
    return client.documents.list();
  },
};

/**
 * Get a document by name
 */
export const documentsGetTool: McpToolDefinition = {
  name: 'macts__textedit__documents_get',
  description: 'Get a document by name',
  inputSchema: {
    "type": "object",
    "properties": {
      "name": {
        "description": "Document name",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "name"
    ]
  },
  handler: async (args) => {
    const { name } = args as { name: string };
    const client = getClient();
    return client.documents.get(name);
  },
};

/**
 * Create a new document
 */
export const documentsCreateTool: McpToolDefinition = {
  name: 'macts__textedit__documents_create',
  description: 'Create a new document',
  inputSchema: {
    "type": "object",
    "properties": {
      "text": {
        "description": "Initial text content",
        "type": "string"
      },
      "name": {
        "description": "The name of the document",
        "type": "string"
      }
    },
    "additionalProperties": false
  },
  handler: async (args) => {
    const client = getClient();
    return client.documents.create(args as Record<string, unknown>);
  },
};

