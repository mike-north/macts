/**
 * API plugin for Safari.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Safari.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Safari.app automation.
 */
export const safariApiPlugin = {
  name: 'safari',
  bundleId: 'com.apple.Safari',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.Safari',
      name: 'Safari',
      displayName: 'Safari',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Safari suite',
        description: 'Safari specific classes',
        code: 'sfri',
        resources: ['Document', 'Tab'],
        commands: [
          'addReadingListItem',
          'doJavaScript',
          'emailContents',
          'searchTheWeb',
          'showBookmarks',
          'showExtensionsPreferences',
          'dispatchMessageToExtension',
          'syncAllPlistToDisk',
          'showPrivacyReport',
          'showCreditCardSettings',
        ],
        enums: [],
      },
    ],
    resources: {
      Document: {
        name: 'Document',
        plural: 'Documents',
        description: 'A Safari document (window)',
        code: 'docu',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The document name',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the document',
            code: 'ID  ',
            optional: false,
          },
          url: {
            access: 'rw',
            type: 'string',
            description: 'The current URL',
            code: 'URL ',
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
      Tab: {
        name: 'Tab',
        plural: 'Tabs',
        description: 'A Safari tab',
        code: 'tab ',
        properties: {
          name: {
            access: 'r',
            type: 'string',
            description: 'The tab name',
            code: 'pnam',
            optional: false,
          },
          id: {
            access: 'r',
            type: 'string',
            description: 'The unique identifier of the tab',
            code: 'ID  ',
            optional: false,
          },
          url: {
            access: 'rw',
            type: 'string',
            description: 'The tab URL',
            code: 'URL ',
            optional: false,
          },
          source: {
            access: 'r',
            type: 'string',
            description: 'The HTML source of the web page currently loaded in the tab',
            code: 'src ',
            optional: false,
          },
          text: {
            access: 'r',
            type: 'string',
            description: 'The text of the web page currently loaded in the tab',
            code: 'text',
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
    },
    enums: {},
    hierarchy: {
      children: {
        documents: {
          resource: 'Document',
          access: 'rw',
          description: 'Safari documents',
          children: {
            tabs: {
              resource: 'Tab',
              access: 'rw',
              description: 'Tabs in a document',
            },
          },
        },
        tabs: {
          resource: 'Tab',
          access: 'rw',
          description: 'All tabs',
        },
      },
    },
    relationships: [],
    commands: {
      addReadingListItem: {
        name: 'addReadingListItem',
        description:
          'Add a new Reading List item with the given URL. Allows a custom title and preview text to be specified.',
        scope: 'application',
        parameters: [
          {
            name: 'andPreviewText',
            type: 'string',
            description:
              'Preview text for the Reading List item, usually the first few sentences of the article',
            required: false,
            code: 'rlip',
          },
          {
            name: 'withTitle',
            type: 'string',
            description: 'Title of the Reading List item',
            required: false,
            code: 'rlit',
          },
        ],
        code: 'arli',
      },
      doJavaScript: {
        name: 'doJavaScript',
        description: 'Applies a string of JavaScript code to a document.',
        scope: 'application',
        parameters: [
          {
            name: 'in',
            type: 'string',
            description: 'The tab that the JavaScript should be evaluated in.',
            required: false,
            code: 'dcnm',
          },
        ],
        code: 'dojs',
      },
      emailContents: {
        name: 'emailContents',
        description: 'Emails the contents of a tab.',
        scope: 'application',
        parameters: [
          {
            name: 'of',
            type: 'string',
            description: 'The tab to send.',
            required: false,
            code: 'dcnm',
          },
        ],
        code: 'mlct',
      },
      searchTheWeb: {
        name: 'searchTheWeb',
        description: "Searches the web using Safari's current search provider.",
        scope: 'application',
        parameters: [
          {
            name: 'in',
            type: 'string',
            description: 'The tab that the search results should shown in.',
            required: false,
            code: 'dcnm',
          },
          {
            name: 'for',
            type: 'string',
            description: 'The query to search for.',
            required: true,
            code: 'qury',
          },
        ],
        code: 'srch',
      },
      showBookmarks: {
        name: 'showBookmarks',
        description: "Shows Safari's bookmarks.",
        scope: 'application',
        parameters: [],
        code: 'opbk',
      },
      showExtensionsPreferences: {
        name: 'showExtensionsPreferences',
        description: 'Show Safari Extensions preferences.',
        scope: 'application',
        parameters: [],
        code: 'ssep',
      },
      dispatchMessageToExtension: {
        name: 'dispatchMessageToExtension',
        description: 'Dispatch a message to a Safari Extension.',
        scope: 'application',
        parameters: [],
        code: 'dste',
      },
      syncAllPlistToDisk: {
        name: 'syncAllPlistToDisk',
        description:
          'Make sure that all in-memory structures are in-sync with their on-disk counterparts.',
        scope: 'application',
        parameters: [],
        code: 'plst',
      },
      showPrivacyReport: {
        name: 'showPrivacyReport',
        description: "Show Safari's Privacy Report",
        scope: 'application',
        parameters: [],
        code: 'pvrp',
      },
      showCreditCardSettings: {
        name: 'showCreditCardSettings',
        description: 'Show Safari Credit Card Settings.',
        scope: 'application',
        parameters: [],
        code: 'sccs',
      },
    },
  } as AppManifest,
} as const
