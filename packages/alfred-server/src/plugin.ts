/**
 * API plugin for Alfred.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Alfred.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Alfred.app automation.
 */
export const alfredApiPlugin = {
  name: 'alfred',
  bundleId: 'com.runningwithcrayons.Alfred',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.runningwithcrayons.Alfred',
      name: 'Alfred',
      displayName: 'Alfred 5',
      tccEntitlements: ['automation'],
      distributionModel: 'developer-id',
    },
    suites: [
      {
        name: 'Alfred Suite',
        description: 'Alfred Scripts',
        code: 'Alfr',
        resources: [],
        commands: [
          'search',
          'action',
          'browse',
          'runTrigger',
          'reloadWorkflow',
          'revealWorkflow',
          'setConfiguration',
          'removeConfiguration',
          'setTheme',
        ],
        enums: [],
      },
    ],
    resources: {
      Application: {
        name: 'Application',
        plural: 'Applications',
        description: 'The Alfred application',
        code: 'capp',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The name of the application',
            code: 'pnam',
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
    },
    enums: {},
    hierarchy: {
      children: {},
    },
    relationships: [],
    commands: {
      search: {
        name: 'search',
        description: 'Show Alfred with the given text',
        scope: 'application',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'The search string to populate Alfred with',
            required: false,
          },
        ],
        code: 'aevt',
        permission: 'alfred:app:search',
      },
      action: {
        name: 'action',
        description: 'Show Alfred actions for the given file',
        scope: 'application',
        parameters: [
          {
            name: 'items',
            type: {
              array: 'string',
            },
            description: 'The items to show actions for',
            required: true,
          },
          {
            name: 'asType',
            type: 'string',
            description: 'An optional type for the items - file, url or text',
            required: false,
            code: 'uaty',
          },
        ],
        code: 'aact',
        permission: 'alfred:app:action',
      },
      browse: {
        name: 'browse',
        description: 'Show Alfred file system navigation for given path',
        scope: 'application',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'The path or search string to browse',
            required: true,
          },
        ],
        code: 'abro',
        permission: 'alfred:app:browse',
      },
      runTrigger: {
        name: 'runTrigger',
        description: 'Run Alfred workflow trigger',
        scope: 'application',
        parameters: [
          {
            name: 'trigger',
            type: 'string',
            description: 'The identifier of the trigger',
            required: true,
          },
          {
            name: 'inWorkflow',
            type: 'string',
            description: 'The workflow bundle identifier',
            required: true,
            code: 'work',
          },
          {
            name: 'withArgument',
            type: 'string',
            description: 'An optional argument',
            required: false,
            code: 'argu',
          },
        ],
        code: 'arnt',
        permission: 'alfred:workflows:runTrigger',
      },
      reloadWorkflow: {
        name: 'reloadWorkflow',
        description: 'Reload Workflow with given UID (folder name) or Bundle ID',
        scope: 'application',
        parameters: [
          {
            name: 'workflow',
            type: 'string',
            description: 'The UID (folder name), or the Bundle ID of the workflow to reload',
            required: true,
          },
        ],
        code: 'arlw',
        permission: 'alfred:workflows:reload',
      },
      revealWorkflow: {
        name: 'revealWorkflow',
        description: 'Reveal Workflow with given UID (folder name) or Bundle ID',
        scope: 'application',
        parameters: [
          {
            name: 'workflow',
            type: 'string',
            description: 'The UID (folder name), or the Bundle ID of the workflow to reveal',
            required: true,
          },
          {
            name: 'configuration',
            type: 'boolean',
            description: 'Optionally open the configuration for this workflow',
            required: false,
            code: 'opco',
          },
          {
            name: 'details',
            type: 'boolean',
            description: 'Optionally open the details for this workflow',
            required: false,
            code: 'opde',
          },
        ],
        code: 'arvw',
        permission: 'alfred:workflows:reveal',
      },
      setConfiguration: {
        name: 'setConfiguration',
        description: 'Modify workflow configuration value, or set environment variable',
        scope: 'application',
        parameters: [
          {
            name: 'variable',
            type: 'string',
            description: 'The name of the variable',
            required: true,
          },
          {
            name: 'toValue',
            type: 'string',
            description: 'The value to set',
            required: true,
            code: 'valu',
          },
          {
            name: 'inWorkflow',
            type: 'string',
            description: 'The workflow bundle identifier',
            required: true,
            code: 'work',
          },
          {
            name: 'exportable',
            type: 'boolean',
            description:
              "If this environment variable is fine for export, i.e. the Don't Export box is left unchecked (Defaults to Don't Export). This option is ignored for workflow configuration items",
            required: false,
            code: 'expo',
          },
        ],
        code: 'awsc',
        permission: 'alfred:workflows:setConfiguration',
      },
      removeConfiguration: {
        name: 'removeConfiguration',
        description:
          'Revert workflow configuration value to default, or delete environment variable',
        scope: 'application',
        parameters: [
          {
            name: 'variable',
            type: 'string',
            description: 'The name of the variable',
            required: true,
          },
          {
            name: 'inWorkflow',
            type: 'string',
            description: 'The workflow bundle identifier',
            required: true,
            code: 'work',
          },
        ],
        code: 'awrc',
        permission: 'alfred:workflows:removeConfiguration',
      },
      setTheme: {
        name: 'setTheme',
        description: 'Change theme in Alfred',
        scope: 'application',
        parameters: [
          {
            name: 'theme',
            type: 'string',
            description: 'The name of the theme to switch to',
            required: true,
          },
        ],
        code: 'asth',
        permission: 'alfred:app:setTheme',
      },
    },
    permissions: {
      app: {
        read: [
          'alfred:app:search',
          'alfred:app:action',
          'alfred:app:browse',
          'alfred:app:setTheme',
        ],
      },
      workflows: {
        read: ['alfred:workflows:runTrigger', 'alfred:workflows:reload', 'alfred:workflows:reveal'],
        write: ['alfred:workflows:setConfiguration', 'alfred:workflows:removeConfiguration'],
      },
    },
    extraction: {
      sourceFile: 'source.sdef',
      confidence: {
        overall: 0.95,
        fields: {
          resources: 1,
          enums: 1,
          hierarchy: 1,
          commands: 0.95,
        },
      },
      openQuestions: [
        {
          question: 'Are the 4-char command codes correct?',
          context: 'Some codes were truncated or abbreviated from the sdef',
          relatedTo: 'commands',
        },
      ],
    },
  } as AppManifest,
} as const
