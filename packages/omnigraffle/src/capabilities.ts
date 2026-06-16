/**
 * Machine-readable capability metadata for OmniGraffle.
 *
 * Generated from the app manifest. Each entry describes one capability —
 * its stable name, app dependency, required permission (`app:resource:operation`),
 * and risk classification (read | write | delete | send | execute | system-change).
 *
 * @packageDocumentation
 */

/**
 * Risk classification for a capability.
 */
export type CapabilityRisk = 'read' | 'write' | 'delete' | 'send' | 'execute' | 'system-change'

/**
 * Machine-readable description of a single capability.
 */
export interface CapabilityMetadata {
  /** Stable dotted capability name (`<app>.<resource>.<operation>`). */
  readonly name: string
  /** App this capability belongs to. */
  readonly app: string
  /** Bundle identifier of the app dependency. */
  readonly appBundleId: string
  /** Resource the operation targets (`app` for app-scoped capabilities). */
  readonly resource: string
  /** Operation name. */
  readonly operation: string
  /** Human-readable description. */
  readonly description: string
  /** Required permission in `app:resource:operation` form, or null if none. */
  readonly permission: string | null
  /** Deterministic risk classification. */
  readonly risk: CapabilityRisk
  /** JSON Schema for the capability's input. */
  readonly inputSchema: Record<string, unknown>
}

/**
 * Every capability exposed by OmniGraffle, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'omnigraffle.app.assemble',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'assemble',
    description: 'Group graphics',
    permission: 'omnigraffle:app:assemble',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        subgraph: {
          description: 'Create as subgraph',
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'omnigraffle.app.connect',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'connect',
    description: 'Draw a line between graphics',
    permission: 'omnigraffle:app:connect',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          description: 'Source graphic ID',
          type: 'string',
        },
        to: {
          description: 'Destination graphic ID',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['from', 'to'],
    },
  },
  {
    name: 'omnigraffle.app.evaluateJavascript',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'evaluateJavascript',
    description: 'Evaluate JavaScript and return the result',
    permission: 'omnigraffle:app:evaluateJavascript',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          description: 'JavaScript code to evaluate',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['script'],
    },
  },
  {
    name: 'omnigraffle.app.export',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'export',
    description: 'Export documents',
    permission: 'omnigraffle:app:export',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        as: {
          description: 'File type',
          type: 'string',
        },
        scope: {
          description: 'Area to export',
          type: 'string',
        },
        to: {
          description: 'Output file path',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['as', 'scope', 'to'],
    },
  },
  {
    name: 'omnigraffle.app.flip',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'flip',
    description: 'Flip graphics',
    permission: 'omnigraffle:app:flip',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        over: {
          description: 'Flip orientation',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['over'],
    },
  },
  {
    name: 'omnigraffle.app.layout',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'layout',
    description: "Layout graphics using the document's Layout Info",
    permission: 'omnigraffle:app:layout',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnigraffle.app.pageAdjust',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'pageAdjust',
    description: 'Change the number of pages to fit the current graphics',
    permission: 'omnigraffle:app:pageAdjust',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnigraffle.app.slide',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'app',
    operation: 'slide',
    description: 'Slide graphics by a vector amount',
    permission: 'omnigraffle:app:slide',
    risk: 'execute',
    inputSchema: {
      type: 'object',
      properties: {
        by: {
          description: 'Vector to slide by',
          type: 'object',
        },
      },
      additionalProperties: false,
      required: ['by'],
    },
  },
  {
    name: 'omnigraffle.canvases.create',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'canvases',
    operation: 'create',
    description: 'Create a new canvas',
    permission: 'omnigraffle:canvases:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Canvas name',
          type: 'string',
        },
        id: {
          description: 'Unique identifier',
          type: 'string',
        },
        adjustsPages: {
          description: 'Adjust number of pages on the canvas automatically?',
          type: 'boolean',
        },
        canvasSizeIsMeasuredInPages: {
          description: 'Whether canvas size is reported as multiples of page size',
          type: 'boolean',
        },
        canvasSize: {
          description: 'Size of the canvas (page size multiplied by number of pages)',
          type: 'object',
        },
        horizontalPages: {
          description: 'Horizontal pages',
          type: 'number',
        },
        verticalPages: {
          description: 'Vertical pages',
          type: 'number',
        },
        columnAlignment: {
          description: 'Column alignment',
          type: 'string',
        },
        rowAlignment: {
          description: 'Row alignment',
          type: 'string',
        },
        columnSpacing: {
          description: 'Spacing between graphics in a column',
          type: 'number',
        },
        rowSpacing: {
          description: 'Spacing between graphics in a row',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: [
        'name',
        'adjustsPages',
        'canvasSizeIsMeasuredInPages',
        'canvasSize',
        'horizontalPages',
        'verticalPages',
        'columnAlignment',
        'rowAlignment',
        'columnSpacing',
        'rowSpacing',
      ],
    },
  },
  {
    name: 'omnigraffle.canvases.get',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'canvases',
    operation: 'get',
    description: 'Get a canvas by ID',
    permission: 'omnigraffle:canvases:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Canvas identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnigraffle.canvases.list',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'canvases',
    operation: 'list',
    description: 'List all canvases',
    permission: 'omnigraffle:canvases:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'omnigraffle.graphics.get',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'graphics',
    operation: 'get',
    description: 'Get a graphic by ID',
    permission: 'omnigraffle:graphics:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Graphic identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnigraffle.graphics.list',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'graphics',
    operation: 'list',
    description: 'List all graphics on a canvas',
    permission: 'omnigraffle:graphics:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        canvasId: {
          description: 'Canvas identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['canvasId'],
    },
  },
  {
    name: 'omnigraffle.layers.create',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'layers',
    operation: 'create',
    description: 'Create a new layer',
    permission: 'omnigraffle:layers:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        canvasId: {
          description: 'Canvas identifier for the layer',
          type: 'string',
        },
        name: {
          description: 'Layer name',
          type: 'string',
        },
        locked: {
          description: "Are the layer's graphics locked?",
          type: 'boolean',
        },
        visible: {
          description: "Are the layer's graphics visible?",
          type: 'boolean',
        },
        prints: {
          description: "Do the layer's graphics print?",
          type: 'boolean',
        },
      },
      additionalProperties: false,
      required: ['canvasId', 'name', 'locked', 'visible', 'prints'],
    },
  },
  {
    name: 'omnigraffle.layers.get',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'layers',
    operation: 'get',
    description: 'Get a layer by name',
    permission: 'omnigraffle:layers:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Layer name',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name'],
    },
  },
  {
    name: 'omnigraffle.layers.list',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'layers',
    operation: 'list',
    description: 'List all layers on a canvas',
    permission: 'omnigraffle:layers:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        canvasId: {
          description: 'Canvas identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['canvasId'],
    },
  },
  {
    name: 'omnigraffle.lines.get',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'lines',
    operation: 'get',
    description: 'Get a line by ID',
    permission: 'omnigraffle:lines:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Line identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnigraffle.lines.list',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'lines',
    operation: 'list',
    description: 'List all lines on a canvas',
    permission: 'omnigraffle:lines:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        canvasId: {
          description: 'Canvas identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['canvasId'],
    },
  },
  {
    name: 'omnigraffle.shapes.create',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'shapes',
    operation: 'create',
    description: 'Create a new shape',
    permission: 'omnigraffle:shapes:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        canvasId: {
          description: 'Canvas identifier for the shape',
          type: 'number',
        },
        origin: {
          description: 'Shape origin',
          type: 'object',
        },
        size: {
          description: 'Shape size',
          type: 'object',
        },
        text: {
          description: 'Text content',
          type: 'string',
        },
        name: {
          description: 'Name of the shape',
          type: 'string',
        },
        fill: {
          description: 'The type of fill for this shape',
          type: 'string',
        },
        fillColor: {
          description: 'The fill color',
          type: 'object',
        },
        gradientColor: {
          description: 'For linear and radial fills, this is the ending color',
          type: 'object',
        },
        gradientAngle: {
          description: 'Angle of a linear gradient fill',
          type: 'number',
        },
        rotation: {
          description: 'Rotation of the graphic in degrees',
          type: 'number',
        },
        textPlacement: {
          description: 'Placement of the text inside the shape',
          type: 'string',
        },
        autosizing: {
          description: 'Autosizing behavior of the shape around the text',
          type: 'string',
        },
        sidePadding: {
          description: 'Padding at the left and right of the text space',
          type: 'number',
        },
        verticalPadding: {
          description: 'Padding at the top and bottom of the text space',
          type: 'number',
        },
      },
      additionalProperties: false,
      required: [
        'canvasId',
        'origin',
        'size',
        'name',
        'fill',
        'fillColor',
        'gradientColor',
        'gradientAngle',
        'rotation',
        'textPlacement',
        'autosizing',
        'sidePadding',
        'verticalPadding',
      ],
    },
  },
  {
    name: 'omnigraffle.shapes.get',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'shapes',
    operation: 'get',
    description: 'Get a shape by ID',
    permission: 'omnigraffle:shapes:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Shape identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'omnigraffle.shapes.list',
    app: 'omnigraffle',
    appBundleId: 'com.omnigroup.OmniGraffle7',
    resource: 'shapes',
    operation: 'list',
    description: 'List all shapes on a canvas',
    permission: 'omnigraffle:shapes:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        canvasId: {
          description: 'Canvas identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['canvasId'],
    },
  },
]
