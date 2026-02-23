/**
 * MCP tools for Omnigraffle.app shapes operations.
 *
 * @packageDocumentation
 */

import type { McpToolDefinition } from '@macts/mcp';
import { getClient } from '../sdk.js';

/**
 * List all shapes on a canvas
 */
export const shapesListTool: McpToolDefinition = {
  name: 'macts__omnigraffle__shapes_list',
  description: 'List all shapes on a canvas',
  inputSchema: {
    "type": "object",
    "properties": {
      "canvasId": {
        "description": "Canvas identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "canvasId"
    ]
  },
  handler: async (args) => {
    const { canvasId } = args as { canvasId: string };
    void canvasId;
    const client = getClient();
    return client.shapes.list();
  },
};

/**
 * Get a shape by ID
 */
export const shapesGetTool: McpToolDefinition = {
  name: 'macts__omnigraffle__shapes_get',
  description: 'Get a shape by ID',
  inputSchema: {
    "type": "object",
    "properties": {
      "id": {
        "description": "Shape identifier",
        "type": "string"
      }
    },
    "additionalProperties": false,
    "required": [
      "id"
    ]
  },
  handler: async (args) => {
    const { id } = args as { id: string };
    const client = getClient();
    return client.shapes.get(id);
  },
};

/**
 * Create a new shape
 */
export const shapesCreateTool: McpToolDefinition = {
  name: 'macts__omnigraffle__shapes_create',
  description: 'Create a new shape',
  inputSchema: {
    "type": "object",
    "properties": {
      "canvasId": {
        "description": "Canvas identifier for the shape",
        "type": "number"
      },
      "origin": {
        "description": "Shape origin",
        "type": "object"
      },
      "size": {
        "description": "Shape size",
        "type": "object"
      },
      "text": {
        "description": "Text content",
        "type": "string"
      },
      "name": {
        "description": "Name of the shape",
        "type": "string"
      },
      "fill": {
        "description": "The type of fill for this shape",
        "type": "string"
      },
      "fillColor": {
        "description": "The fill color",
        "type": "object"
      },
      "gradientColor": {
        "description": "For linear and radial fills, this is the ending color",
        "type": "object"
      },
      "gradientAngle": {
        "description": "Angle of a linear gradient fill",
        "type": "number"
      },
      "rotation": {
        "description": "Rotation of the graphic in degrees",
        "type": "number"
      },
      "textPlacement": {
        "description": "Placement of the text inside the shape",
        "type": "string"
      },
      "autosizing": {
        "description": "Autosizing behavior of the shape around the text",
        "type": "string"
      },
      "sidePadding": {
        "description": "Padding at the left and right of the text space",
        "type": "number"
      },
      "verticalPadding": {
        "description": "Padding at the top and bottom of the text space",
        "type": "number"
      }
    },
    "additionalProperties": false,
    "required": [
      "canvasId",
      "origin",
      "size",
      "name",
      "fill",
      "fillColor",
      "gradientColor",
      "gradientAngle",
      "rotation",
      "textPlacement",
      "autosizing",
      "sidePadding",
      "verticalPadding"
    ]
  },
  handler: async (args) => {
    const client = getClient();
    return client.shapes.create(args as Record<string, unknown>);
  },
};

