/**
 * API plugin for Xcode.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Xcode.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Xcode.app automation.
 */
export const xcodeApiPlugin = {
  name: 'xcode',
  bundleId: 'com.apple.dt.Xcode',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.dt.Xcode',
      name: 'Xcode',
      displayName: 'Xcode',
      tccEntitlements: ['automation'],
      distributionModel: 'developer-id',
    },
    suites: [
      {
        name: 'Standard Suite',
        description: 'Common classes and commands for all applications',
        code: '????',
        resources: [],
        commands: [],
        enums: [],
      },
      {
        name: 'Xcode Application Suite',
        description: 'Application-level classes and commands',
        code: 'pbas',
        resources: ['FileDocument', 'SourceDocument', 'WorkspaceDocument'],
        commands: [],
        enums: [],
      },
      {
        name: 'Xcode Document Suite',
        description: 'Document-related classes',
        code: 'pbds',
        resources: ['TextDocument'],
        commands: [],
        enums: [],
      },
      {
        name: 'Xcode Scheme Suite',
        description: 'Commands for scheme actions and related objects',
        code: 'pbss',
        resources: [
          'SchemeActionResult',
          'Scheme',
          'RunDestination',
          'Device',
          'BuildError',
          'BuildWarning',
          'AnalyzerIssue',
          'TestFailure',
        ],
        commands: ['build', 'clean', 'stop', 'run', 'test', 'attach', 'debug'],
        enums: ['SchemeActionResultStatus'],
      },
      {
        name: 'Xcode Project Suite',
        description: "Classes and commands related to Xcode's project model",
        code: 'pbps',
        resources: [
          'BuildConfiguration',
          'Project',
          'BuildSetting',
          'ResolvedBuildSetting',
          'Target',
        ],
        commands: [],
        enums: [],
      },
    ],
    resources: {
      WorkspaceDocument: {
        name: 'WorkspaceDocument',
        plural: 'WorkspaceDocuments',
        description:
          'A document that represents a workspace on disk. Workspaces are the top-level container for almost all objects and commands in Xcode',
        code: 'wksd',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the workspace',
            code: 'pnam',
            optional: false,
          },
          modified: {
            access: 'r',
            type: 'boolean',
            description: 'Has it been modified since the last save?',
            code: 'imod',
            optional: false,
          },
          file: {
            access: 'r',
            type: 'file',
            description: 'Its location on disk, if it has one',
            code: 'file',
            optional: false,
          },
          path: {
            access: 'r',
            type: 'string',
            description: "The document's path",
            code: 'ppth',
            optional: false,
          },
          loaded: {
            access: 'r',
            type: 'boolean',
            description: 'Whether the workspace document has finished loading after being opened',
            code: 'load',
            optional: false,
          },
          activeScheme: {
            access: 'rw',
            type: {
              resource: 'Scheme',
            },
            description: "The workspace's scheme that will be used for scheme actions",
            code: 'arun',
            optional: false,
          },
          activeRunDestination: {
            access: 'rw',
            type: {
              resource: 'RunDestination',
            },
            description: "The workspace's run destination that will be used for scheme actions",
            code: 'arud',
            optional: false,
          },
          lastSchemeActionResult: {
            access: 'r',
            type: {
              resource: 'SchemeActionResult',
            },
            description:
              'The scheme action result for the last scheme action command issued to the workspace document',
            code: 'lsar',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
      FileDocument: {
        name: 'FileDocument',
        plural: 'FileDocuments',
        description: 'A document that represents a file on disk',
        code: 'fild',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the document',
            code: 'pnam',
            optional: false,
          },
          modified: {
            access: 'r',
            type: 'boolean',
            description: 'Has it been modified since the last save?',
            code: 'imod',
            optional: false,
          },
          file: {
            access: 'r',
            type: 'file',
            description: 'Its location on disk, if it has one',
            code: 'file',
            optional: false,
          },
          path: {
            access: 'r',
            type: 'string',
            description: "The document's path",
            code: 'ppth',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
      TextDocument: {
        name: 'TextDocument',
        plural: 'TextDocuments',
        description: 'A document that represents a text file on disk',
        code: 'texd',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the document',
            code: 'pnam',
            optional: false,
          },
          modified: {
            access: 'r',
            type: 'boolean',
            description: 'Has it been modified since the last save?',
            code: 'imod',
            optional: false,
          },
          file: {
            access: 'r',
            type: 'file',
            description: 'Its location on disk, if it has one',
            code: 'file',
            optional: false,
          },
          path: {
            access: 'r',
            type: 'string',
            description: "The document's path",
            code: 'ppth',
            optional: false,
          },
          selectedCharacterRange: {
            access: 'rw',
            type: 'any',
            description: 'The first and last character positions in the selection',
            code: 'xscr',
            optional: false,
          },
          selectedParagraphRange: {
            access: 'rw',
            type: 'any',
            description: 'The first and last paragraph positions that contain the selection',
            code: 'xspr',
            optional: false,
          },
          text: {
            access: 'rw',
            type: 'string',
            description: 'The text of the text file referenced',
            code: 'ctxt',
            optional: false,
          },
          notifiesWhenClosing: {
            access: 'rw',
            type: 'boolean',
            description: 'Should Xcode notify other apps when this document is closed?',
            code: 'wnoc',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
      SourceDocument: {
        name: 'SourceDocument',
        plural: 'SourceDocuments',
        description: 'A document that represents a source file on disk',
        code: 'souf',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the document',
            code: 'pnam',
            optional: false,
          },
          modified: {
            access: 'r',
            type: 'boolean',
            description: 'Has it been modified since the last save?',
            code: 'imod',
            optional: false,
          },
          file: {
            access: 'r',
            type: 'file',
            description: 'Its location on disk, if it has one',
            code: 'file',
            optional: false,
          },
          path: {
            access: 'r',
            type: 'string',
            description: "The document's path",
            code: 'ppth',
            optional: false,
          },
          selectedCharacterRange: {
            access: 'rw',
            type: 'any',
            description: 'The first and last character positions in the selection',
            code: 'xscr',
            optional: false,
          },
          selectedParagraphRange: {
            access: 'rw',
            type: 'any',
            description: 'The first and last paragraph positions that contain the selection',
            code: 'xspr',
            optional: false,
          },
          text: {
            access: 'rw',
            type: 'string',
            description: 'The text of the text file referenced',
            code: 'ctxt',
            optional: false,
          },
          notifiesWhenClosing: {
            access: 'rw',
            type: 'boolean',
            description: 'Should Xcode notify other apps when this document is closed?',
            code: 'wnoc',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
      Project: {
        name: 'Project',
        plural: 'Projects',
        description:
          'An Xcode project. Projects represent project files on disk and are always open in the context of a workspace document',
        code: 'proj',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier for the project',
            code: 'ID  ',
            optional: false,
          },
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the project',
            code: 'pnam',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      Target: {
        name: 'Target',
        plural: 'Targets',
        description:
          'A target is a blueprint for building a product. Targets inherit build settings from their project if not overridden in the target',
        code: 'tarR',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier for the target',
            code: 'ID  ',
            optional: false,
          },
          name: {
            access: 'rw',
            type: 'string',
            description: 'The name of this target',
            code: 'pnam',
            optional: false,
          },
          project: {
            access: 'r',
            type: {
              resource: 'Project',
            },
            description: 'The project that contains this target',
            code: 'proj',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      BuildConfiguration: {
        name: 'BuildConfiguration',
        plural: 'BuildConfigurations',
        description:
          'A set of build settings for a target or project. Each target in a project has the same named build configurations as the project',
        code: 'bucf',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier for the build configuration',
            code: 'ID  ',
            optional: false,
          },
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the build configuration',
            code: 'pnam',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      BuildSetting: {
        name: 'BuildSetting',
        plural: 'BuildSettings',
        description: 'A setting that controls how products are built',
        code: 'asbs',
        properties: {
          name: {
            access: 'rw',
            type: 'string',
            description: 'The unlocalized build setting name (e.g. DSTROOT)',
            code: 'pnam',
            optional: false,
          },
          value: {
            access: 'rw',
            type: 'string',
            description: 'A string value for the build setting',
            code: 'valL',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
      ResolvedBuildSetting: {
        name: 'ResolvedBuildSetting',
        plural: 'ResolvedBuildSettings',
        description: 'An object that represents a resolved value for a build setting',
        code: 'asrs',
        properties: {
          name: {
            access: 'rw',
            type: 'string',
            description: 'The unlocalized build setting name (e.g. DSTROOT)',
            code: 'pnam',
            optional: false,
          },
          value: {
            access: 'rw',
            type: 'string',
            description: 'A string value for the build setting',
            code: 'valL',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
      Scheme: {
        name: 'Scheme',
        plural: 'Schemes',
        description:
          'A set of parameters for building, testing, launching or distributing the products of a workspace',
        code: 'runx',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier for the scheme',
            code: 'ID  ',
            optional: false,
          },
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the scheme',
            code: 'pnam',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      RunDestination: {
        name: 'RunDestination',
        plural: 'RunDestinations',
        description:
          'An object which specifies parameters such as the device and architecture for which to perform a scheme action',
        code: 'rund',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: "The name of the run destination, as displayed in Xcode's interface",
            code: 'pnam',
            optional: false,
          },
          architecture: {
            access: 'r',
            type: 'string',
            description: 'The architecture for which this run destination results in execution',
            code: 'arch',
            optional: false,
          },
          platform: {
            access: 'r',
            type: 'string',
            description: 'The identifier of the platform which this run destination targets',
            code: 'plat',
            optional: false,
          },
          device: {
            access: 'r',
            type: {
              resource: 'Device',
            },
            description: 'The physical or virtual device which this run destination targets',
            code: 'rdev',
            optional: false,
          },
          companionDevice: {
            access: 'r',
            type: {
              resource: 'Device',
            },
            description: "If the run destination's device has a companion, this is that device",
            code: 'cdev',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'name',
            primary: true,
          },
        ],
      },
      Device: {
        name: 'Device',
        plural: 'Devices',
        description:
          'A device which can be used as the target for a scheme action, as part of a run destination',
        code: 'devc',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the device',
            code: 'pnam',
            optional: false,
          },
          deviceIdentifier: {
            access: 'r',
            type: 'string',
            description: 'A stable identifier for the device',
            code: 'dvid',
            optional: false,
          },
          operatingSystemVersion: {
            access: 'r',
            type: 'string',
            description: 'The version of the operating system installed on the device',
            code: 'osvr',
            optional: false,
          },
          deviceModel: {
            access: 'r',
            type: 'string',
            description: 'The model of device',
            code: 'dvty',
            optional: false,
          },
          generic: {
            access: 'r',
            type: 'boolean',
            description:
              'Whether this run destination is generic instead of representing a specific device',
            code: 'gnrc',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'deviceIdentifier',
            primary: true,
          },
        ],
      },
      SchemeActionResult: {
        name: 'SchemeActionResult',
        plural: 'SchemeActionResults',
        description: 'An object describing the result of performing a scheme action command',
        code: 'sart',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier for the scheme action result',
            code: 'ID  ',
            optional: false,
          },
          completed: {
            access: 'r',
            type: 'boolean',
            description:
              'Whether this scheme action has completed (successfully or otherwise) or not',
            code: 'sarc',
            optional: false,
          },
          status: {
            access: 'rw',
            type: {
              enum: 'SchemeActionResultStatus',
            },
            description: 'Indicates the status of the scheme action',
            code: 'sars',
            optional: false,
          },
          errorMessage: {
            access: 'rw',
            type: 'string',
            description:
              'If the result\'s status is "error occurred", this will be the error message',
            code: 'sare',
            optional: false,
          },
          buildLog: {
            access: 'rw',
            type: 'string',
            description:
              'If this scheme action performed a build, this will be the text of the build log',
            code: 'blog',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'id',
            primary: true,
          },
        ],
      },
      BuildError: {
        name: 'BuildError',
        plural: 'BuildErrors',
        description: 'An error generated by a build',
        code: 'sabe',
        properties: {
          message: {
            access: 'rw',
            type: 'string',
            description: 'The text of the issue',
            code: 'samt',
            optional: false,
          },
          filePath: {
            access: 'rw',
            type: 'string',
            description: 'The file path where the issue occurred',
            code: 'safp',
            optional: false,
          },
          startingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting line number in the file where the issue occurred',
            code: 'sasl',
            optional: false,
          },
          endingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending line number in the file where the issue occurred',
            code: 'sael',
            optional: false,
          },
          startingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting column number in the file where the issue occurred',
            code: 'sasc',
            optional: false,
          },
          endingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending column number in the file where the issue occurred',
            code: 'saec',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'message',
            primary: true,
          },
        ],
      },
      BuildWarning: {
        name: 'BuildWarning',
        plural: 'BuildWarnings',
        description: 'A warning generated by a build',
        code: 'sabw',
        properties: {
          message: {
            access: 'rw',
            type: 'string',
            description: 'The text of the issue',
            code: 'samt',
            optional: false,
          },
          filePath: {
            access: 'rw',
            type: 'string',
            description: 'The file path where the issue occurred',
            code: 'safp',
            optional: false,
          },
          startingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting line number in the file where the issue occurred',
            code: 'sasl',
            optional: false,
          },
          endingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending line number in the file where the issue occurred',
            code: 'sael',
            optional: false,
          },
          startingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting column number in the file where the issue occurred',
            code: 'sasc',
            optional: false,
          },
          endingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending column number in the file where the issue occurred',
            code: 'saec',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'message',
            primary: true,
          },
        ],
      },
      AnalyzerIssue: {
        name: 'AnalyzerIssue',
        plural: 'AnalyzerIssues',
        description: 'A warning generated by the static analyzer',
        code: 'saai',
        properties: {
          message: {
            access: 'rw',
            type: 'string',
            description: 'The text of the issue',
            code: 'samt',
            optional: false,
          },
          filePath: {
            access: 'rw',
            type: 'string',
            description: 'The file path where the issue occurred',
            code: 'safp',
            optional: false,
          },
          startingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting line number in the file where the issue occurred',
            code: 'sasl',
            optional: false,
          },
          endingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending line number in the file where the issue occurred',
            code: 'sael',
            optional: false,
          },
          startingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting column number in the file where the issue occurred',
            code: 'sasc',
            optional: false,
          },
          endingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending column number in the file where the issue occurred',
            code: 'saec',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'message',
            primary: true,
          },
        ],
      },
      TestFailure: {
        name: 'TestFailure',
        plural: 'TestFailures',
        description: 'A failure from a test',
        code: 'satf',
        properties: {
          message: {
            access: 'rw',
            type: 'string',
            description: 'The text of the issue',
            code: 'samt',
            optional: false,
          },
          filePath: {
            access: 'rw',
            type: 'string',
            description: 'The file path where the issue occurred',
            code: 'safp',
            optional: false,
          },
          startingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting line number in the file where the issue occurred',
            code: 'sasl',
            optional: false,
          },
          endingLineNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending line number in the file where the issue occurred',
            code: 'sael',
            optional: false,
          },
          startingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The starting column number in the file where the issue occurred',
            code: 'sasc',
            optional: false,
          },
          endingColumnNumber: {
            access: 'rw',
            type: 'integer',
            description: 'The ending column number in the file where the issue occurred',
            code: 'saec',
            optional: false,
          },
        },
        identifiers: [
          {
            property: 'message',
            primary: true,
          },
        ],
      },
    },
    enums: {
      SchemeActionResultStatus: {
        name: 'SchemeActionResultStatus',
        description: 'The status of a scheme action result object',
        code: 'srs ',
        values: [
          {
            name: 'notYetStarted',
            value: 'notYetStarted',
            description: 'The action has not yet started',
            code: 'srsn',
          },
          {
            name: 'running',
            value: 'running',
            description: 'The action is in progress',
            code: 'srsr',
          },
          {
            name: 'cancelled',
            value: 'cancelled',
            description: 'The action was cancelled',
            code: 'srsc',
          },
          {
            name: 'failed',
            value: 'failed',
            description: 'The action ran but did not complete successfully',
            code: 'srsf',
          },
          {
            name: 'errorOccurred',
            value: 'errorOccurred',
            description: 'The action was not able to run due to an error',
            code: 'srse',
          },
          {
            name: 'succeeded',
            value: 'succeeded',
            description: 'The action succeeded',
            code: 'srss',
          },
        ],
      },
    },
    hierarchy: {
      children: {
        workspaceDocuments: {
          resource: 'WorkspaceDocument',
          access: 'r',
          description: 'Workspace documents in the application',
          children: {
            projects: {
              resource: 'Project',
              access: 'r',
              description: 'Projects in the workspace',
              children: {
                targets: {
                  resource: 'Target',
                  access: 'r',
                  description: 'Targets in the project',
                  children: {
                    buildConfigurations: {
                      resource: 'BuildConfiguration',
                      access: 'r',
                      description: 'Build configurations for the target',
                      children: {
                        buildSettings: {
                          resource: 'BuildSetting',
                          access: 'r',
                          description: 'Build settings in the configuration',
                        },
                        resolvedBuildSettings: {
                          resource: 'ResolvedBuildSetting',
                          access: 'r',
                          description: 'Resolved build settings in the configuration',
                        },
                      },
                    },
                  },
                },
                buildConfigurations: {
                  resource: 'BuildConfiguration',
                  access: 'r',
                  description: 'Build configurations for the project',
                  children: {
                    buildSettings: {
                      resource: 'BuildSetting',
                      access: 'r',
                      description: 'Build settings in the configuration',
                    },
                    resolvedBuildSettings: {
                      resource: 'ResolvedBuildSetting',
                      access: 'r',
                      description: 'Resolved build settings in the configuration',
                    },
                  },
                },
              },
            },
            schemes: {
              resource: 'Scheme',
              access: 'r',
              description: 'Schemes in the workspace',
            },
            runDestinations: {
              resource: 'RunDestination',
              access: 'r',
              description: 'Run destinations available in the workspace',
            },
          },
        },
        fileDocuments: {
          resource: 'FileDocument',
          access: 'r',
          description: 'File documents in the application',
        },
        sourceDocuments: {
          resource: 'SourceDocument',
          access: 'r',
          description: 'Source documents in the application',
        },
        textDocuments: {
          resource: 'TextDocument',
          access: 'r',
          description: 'Text documents in the application',
        },
      },
    },
    relationships: [],
    commands: {
      listWorkspaceDocuments: {
        name: 'list',
        description: 'List all workspace documents',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [],
        code: 'core',
        permission: 'xcode:workspaceDocuments:list',
      },
      getWorkspaceDocument: {
        name: 'get',
        description: 'Get a workspace document by name',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'xcode:workspaceDocuments:get',
      },
      listProjects: {
        name: 'list',
        description: 'List all projects in a workspace',
        scope: 'resource',
        resourceType: 'Project',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
        ],
        code: 'core',
        permission: 'xcode:projects:list',
      },
      getProject: {
        name: 'get',
        description: 'Get a project by ID',
        scope: 'resource',
        resourceType: 'Project',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Project identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'xcode:projects:get',
      },
      listSchemes: {
        name: 'list',
        description: 'List all schemes in a workspace',
        scope: 'resource',
        resourceType: 'Scheme',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
        ],
        code: 'core',
        permission: 'xcode:schemes:list',
      },
      getScheme: {
        name: 'get',
        description: 'Get a scheme by ID',
        scope: 'resource',
        resourceType: 'Scheme',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'Scheme identifier',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'xcode:schemes:get',
      },
      listRunDestinations: {
        name: 'list',
        description: 'List all run destinations in a workspace',
        scope: 'resource',
        resourceType: 'RunDestination',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
        ],
        code: 'core',
        permission: 'xcode:runDestinations:list',
      },
      getRunDestination: {
        name: 'get',
        description: 'Get a run destination by name',
        scope: 'resource',
        resourceType: 'RunDestination',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'Run destination name',
            required: true,
          },
        ],
        code: 'getd',
        permission: 'xcode:runDestinations:get',
      },
      build: {
        name: 'build',
        description: 'Invoke the "build" scheme action',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
        ],
        code: 'xcod',
        permission: 'xcode:workspace:build',
      },
      clean: {
        name: 'clean',
        description: 'Invoke the "clean" scheme action',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
        ],
        code: 'xcod',
        permission: 'xcode:workspace:clean',
      },
      stop: {
        name: 'stop',
        description: 'Stop the active scheme action, if one is running',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
        ],
        code: 'xcod',
        permission: 'xcode:workspace:stop',
      },
      run: {
        name: 'run',
        description: 'Invoke the "run" scheme action',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
          {
            name: 'withCommandLineArguments',
            type: 'any',
            description: 'Additional command line arguments to pass to the action',
            required: false,
          },
          {
            name: 'withEnvironmentVariables',
            type: 'any',
            description: 'Additional environment variables to set for the action',
            required: false,
          },
        ],
        code: 'xcod',
        permission: 'xcode:workspace:run',
      },
      test: {
        name: 'test',
        description: 'Invoke the "test" scheme action',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
          {
            name: 'withCommandLineArguments',
            type: 'any',
            description: 'Additional command line arguments to pass to the action',
            required: false,
          },
          {
            name: 'withEnvironmentVariables',
            type: 'any',
            description: 'Additional environment variables to set for the action',
            required: false,
          },
        ],
        code: 'xcod',
        permission: 'xcode:workspace:test',
      },
      attach: {
        name: 'attach',
        description: 'Start a new debugging session in the workspace',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
          {
            name: 'toProcessIdentifier',
            type: 'integer',
            description: 'The process identifier (pid) to which to attach',
            required: true,
          },
          {
            name: 'suspended',
            type: 'boolean',
            description: 'Whether to start debugging in a suspended state',
            required: true,
          },
        ],
        code: 'xcod',
        permission: 'xcode:workspace:attach',
      },
      debug: {
        name: 'debug',
        description:
          'Start a debugging session using the "run" or "run without building" scheme action',
        scope: 'resource',
        resourceType: 'WorkspaceDocument',
        parameters: [
          {
            name: 'workspaceName',
            type: 'string',
            description: 'Workspace document name',
            required: true,
          },
          {
            name: 'scheme',
            type: 'string',
            description: 'Scheme name',
            required: false,
          },
          {
            name: 'runDestinationSpecifier',
            type: 'string',
            description: 'Run destination specifier string',
            required: false,
          },
          {
            name: 'skipBuilding',
            type: 'boolean',
            description: 'Whether to perform "run without building" rather than "run"',
            required: false,
          },
          {
            name: 'commandLineArguments',
            type: 'any',
            description: 'Additional command line arguments to pass to the action',
            required: false,
          },
          {
            name: 'environmentVariables',
            type: 'any',
            description: 'Additional environment variables to set for the action',
            required: false,
          },
        ],
        code: 'xcod',
        permission: 'xcode:workspace:debug',
      },
    },
    permissions: {
      workspaceDocuments: {
        read: ['xcode:workspaceDocuments:list', 'xcode:workspaceDocuments:get'],
      },
      projects: {
        read: ['xcode:projects:list', 'xcode:projects:get'],
      },
      targets: {
        read: ['xcode:targets:list', 'xcode:targets:get'],
      },
      buildConfigurations: {
        read: ['xcode:buildConfigurations:list', 'xcode:buildConfigurations:get'],
      },
      schemes: {
        read: ['xcode:schemes:list', 'xcode:schemes:get'],
      },
      runDestinations: {
        read: ['xcode:runDestinations:list', 'xcode:runDestinations:get'],
      },
      workspace: {
        read: [
          'xcode:workspace:build',
          'xcode:workspace:clean',
          'xcode:workspace:stop',
          'xcode:workspace:run',
          'xcode:workspace:test',
          'xcode:workspace:attach',
          'xcode:workspace:debug',
        ],
      },
    },
    extraction: {
      sourceFile: 'xcode-sdef.xml',
      confidence: {
        overall: 0.9,
        fields: {
          resources: 0.95,
          commands: 0.9,
          hierarchy: 0.9,
          enums: 1,
        },
      },
      openQuestions: [],
    },
  } as AppManifest,
} as const
