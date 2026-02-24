/**
 * API plugin for Finder.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core'

/**
 * API plugin for Finder.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Finder.app automation.
 */
export const finderApiPlugin = {
  name: 'finder',
  bundleId: 'com.apple.finder',
  manifest: {
    version: '1.0',
    app: {
      bundleId: 'com.apple.finder',
      name: 'Finder',
      displayName: 'Finder',
      tccEntitlements: ['automation'],
      distributionModel: 'system',
    },
    suites: [
      {
        name: 'Standard Suite',
        description: 'Common terms that most applications should support',
        code: 'CoRe',
        resources: [],
        commands: [
          'open',
          'print',
          'quit',
          'activate',
          'close',
          'count',
          'dataSize',
          'delete',
          'duplicate',
          'exists',
          'make',
          'move',
          'select',
        ],
        enums: [],
      },
      {
        name: 'Finder Basics',
        description: 'Commonly-used Finder commands and object classes',
        code: 'fndr',
        resources: [],
        commands: ['openVirtualLocation', 'copy', 'sort'],
        enums: [],
      },
      {
        name: 'Finder items',
        description: 'Commands used with file system items, and basic item definition',
        code: 'fndr',
        resources: [],
        commands: ['cleanUp', 'eject', 'empty', 'erase', 'reveal', 'update'],
        enums: ['Priv'],
      },
      {
        name: 'Containers and folders',
        description: 'Classes that can contain other file system items',
        code: 'fndr',
        resources: ['Container', 'Disk', 'Folder', 'DesktopObject', 'TrashObject'],
        commands: [],
        enums: ['Edfm'],
      },
      {
        name: 'Files',
        description: 'Classes representing files',
        code: 'fndr',
        resources: [
          'File',
          'AliasFile',
          'ApplicationFile',
          'DocumentFile',
          'InternetLocationFile',
          'Clipping',
          'Package',
        ],
        commands: [],
        enums: [],
      },
      {
        name: 'Window classes',
        description: 'Classes representing windows',
        code: 'fndr',
        resources: ['FinderWindow', 'ClippingWindow'],
        commands: [],
        enums: ['Ipnl', 'Pple', 'Ecvw'],
      },
      {
        name: 'Legacy suite',
        description:
          'Operations formerly handled by the Finder, but now automatically delegated to other applications',
        code: 'fleg',
        resources: [],
        commands: ['restart', 'shutDown', 'sleep'],
        enums: [],
      },
      {
        name: 'Type Definitions',
        description: 'Definitions of records used in scripting the Finder',
        code: 'tpdf',
        resources: ['ListViewOptions', 'Column'],
        commands: [],
        enums: ['Earr', 'Epos', 'Sodr', 'Elsv', 'Lvic'],
      },
      {
        name: 'Enumerations',
        description: 'Enumerations for the Finder',
        code: 'tpnm',
        resources: [],
        commands: [],
        enums: ['Isiz', 'Sort'],
      },
    ],
    resources: {
      Container: {
        name: 'Container',
        plural: 'Containers',
        description: 'An item that contains other items',
        code: 'ctnr',
        properties: {
          entireContents: {
            access: 'r',
            type: 'string',
            description:
              'the entire contents of the container, including the contents of its children',
            code: 'ects',
            optional: false,
          },
          expandable: {
            access: 'r',
            type: 'boolean',
            description:
              '(NOT AVAILABLE YET) Is the container capable of being expanded as an outline?',
            code: 'pexa',
            optional: false,
          },
          expanded: {
            access: 'rw',
            type: 'boolean',
            description:
              '(NOT AVAILABLE YET) Is the container opened as an outline? (can only be set for containers viewed as lists)',
            code: 'pexp',
            optional: false,
          },
          completelyExpanded: {
            access: 'rw',
            type: 'boolean',
            description:
              '(NOT AVAILABLE YET) Are the container and all of its children opened as outlines? (can only be set for containers viewed as lists)',
            code: 'pexc',
            optional: false,
          },
          containerWindow: {
            access: 'r',
            type: 'string',
            description: 'the container window for this folder',
            code: 'cwnd',
            optional: false,
          },
        },
      },
      Disk: {
        name: 'Disk',
        plural: 'Disks',
        description: 'A disk',
        code: 'cdis',
        properties: {
          id: {
            access: 'r',
            type: 'integer',
            description:
              'the unique id for this disk (unchanged while disk remains connected and Finder remains running)',
            code: 'ID  ',
            optional: false,
          },
          capacity: {
            access: 'r',
            type: 'number',
            description: 'the total number of bytes (free or used) on the disk',
            code: 'capa',
            optional: false,
          },
          freeSpace: {
            access: 'r',
            type: 'number',
            description: 'the number of free bytes left on the disk',
            code: 'frsp',
            optional: false,
          },
          ejectable: {
            access: 'r',
            type: 'boolean',
            description: 'Can the media be ejected (floppies, CDs, and so on)?',
            code: 'isej',
            optional: false,
          },
          localVolume: {
            access: 'r',
            type: 'boolean',
            description: 'Is the media a local volume (as opposed to a file server)?',
            code: 'isrv',
            optional: false,
          },
          startup: {
            access: 'r',
            type: 'boolean',
            description: 'Is this disk the boot disk?',
            code: 'istd',
            optional: false,
          },
          format: {
            access: 'r',
            type: 'string',
            description: 'the filesystem format of this disk',
            code: 'dfmt',
            optional: false,
          },
          journalingEnabled: {
            access: 'r',
            type: 'boolean',
            description: 'Does this disk do file system journaling?',
            code: 'Jrnl',
            optional: false,
          },
          ignorePrivileges: {
            access: 'rw',
            type: 'boolean',
            description: 'Ignore permissions on this disk?',
            code: 'igpr',
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
      Folder: {
        name: 'Folder',
        plural: 'Folders',
        description: 'A folder',
        code: 'cfol',
        properties: {
          id: {
            access: 'r',
            type: 'integer',
            description: 'Unique identifier for this folder',
            code: 'ID  ',
            optional: false,
          },
        },
      },
      DesktopObject: {
        name: 'DesktopObject',
        plural: 'DesktopObjects',
        description: 'Desktop-object is the class of the "desktop" object',
        code: 'cdsk',
        properties: {
          id: {
            access: 'r',
            type: 'integer',
            description: 'Unique identifier for the desktop',
            code: 'ID  ',
            optional: false,
          },
        },
      },
      TrashObject: {
        name: 'TrashObject',
        plural: 'TrashObjects',
        description: 'Trash-object is the class of the “trash” object',
        code: 'ctrs',
        properties: {
          warnsBeforeEmptying: {
            access: 'rw',
            type: 'boolean',
            description: 'Display a dialog when emptying the trash?',
            code: 'warn',
            optional: false,
          },
        },
      },
      File: {
        name: 'File',
        plural: 'Files',
        description: 'A file',
        code: 'file',
        properties: {
          fileType: {
            access: 'rw',
            type: 'string',
            description: 'the OSType identifying the type of data contained in the item',
            code: 'asty',
            optional: false,
          },
          creatorType: {
            access: 'rw',
            type: 'string',
            description: 'the OSType identifying the application that created the item',
            code: 'fcrt',
            optional: false,
          },
          stationery: {
            access: 'rw',
            type: 'boolean',
            description: 'Is the file a stationery pad?',
            code: 'pspd',
            optional: false,
          },
          productVersion: {
            access: 'r',
            type: 'string',
            description: 'the version of the product (visible at the top of the “Get Info” window)',
            code: 'ver2',
            optional: false,
          },
          version: {
            access: 'r',
            type: 'string',
            description: 'the version of the file (visible at the bottom of the “Get Info” window)',
            code: 'vers',
            optional: false,
          },
        },
      },
      AliasFile: {
        name: 'AliasFile',
        plural: 'AliasFiles',
        description: 'An alias file (created with “Make Alias”)',
        code: 'alia',
        properties: {
          originalItem: {
            access: 'rw',
            type: 'string',
            description: 'the original item pointed to by the alias',
            code: 'orig',
            optional: false,
          },
        },
      },
      ApplicationFile: {
        name: 'ApplicationFile',
        plural: 'ApplicationFiles',
        description: "An application's file on disk",
        code: 'appf',
        properties: {
          id: {
            access: 'r',
            type: 'string',
            description: 'the bundle identifier or creator type of the application',
            code: 'ID  ',
            optional: false,
          },
          suggestedSize: {
            access: 'r',
            type: 'integer',
            description:
              '(AVAILABLE IN 10.1 TO 10.4) the memory size with which the developer recommends the application be launched',
            code: 'sprt',
            optional: false,
          },
          minimumSize: {
            access: 'rw',
            type: 'integer',
            description:
              '(AVAILABLE IN 10.1 TO 10.4) the smallest memory size with which the application can be launched',
            code: 'mprt',
            optional: false,
          },
          preferredSize: {
            access: 'rw',
            type: 'integer',
            description:
              '(AVAILABLE IN 10.1 TO 10.4) the memory size with which the application will be launched',
            code: 'appt',
            optional: false,
          },
          acceptsHighLevelEvents: {
            access: 'r',
            type: 'boolean',
            description:
              'Is the application high-level event aware? (OBSOLETE: always returns true)',
            code: 'isab',
            optional: false,
          },
          hasScriptingTerminology: {
            access: 'r',
            type: 'boolean',
            description: 'Does the process have a scripting terminology, i.e., can it be scripted?',
            code: 'hscr',
            optional: false,
          },
          opensInClassic: {
            access: 'rw',
            type: 'boolean',
            description:
              '(AVAILABLE IN 10.1 TO 10.4) Should the application launch in the Classic environment?',
            code: 'Clsc',
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
      DocumentFile: {
        name: 'DocumentFile',
        plural: 'DocumentFiles',
        description: 'A document file',
        code: 'docf',
        properties: {
          id: {
            access: 'r',
            type: 'integer',
            description: 'Unique identifier for this document',
            code: 'ID  ',
            optional: false,
          },
        },
      },
      InternetLocationFile: {
        name: 'InternetLocationFile',
        plural: 'InternetLocationFiles',
        description: 'A file containing an internet location',
        code: 'inlf',
        properties: {
          location: {
            access: 'r',
            type: 'string',
            description: 'the internet location',
            code: 'iloc',
            optional: false,
          },
        },
      },
      Clipping: {
        name: 'Clipping',
        plural: 'Clippings',
        description: 'A clipping',
        code: 'clpf',
        properties: {
          clippingWindow: {
            access: 'r',
            type: 'string',
            description: '(NOT AVAILABLE YET) the clipping window for this clipping',
            code: 'lwnd',
            optional: false,
          },
        },
      },
      Package: {
        name: 'Package',
        plural: 'Packages',
        description: 'A package',
        code: 'pack',
        properties: {
          id: {
            access: 'r',
            type: 'integer',
            description: 'Unique identifier for this package',
            code: 'ID  ',
            optional: false,
          },
        },
      },
      FinderWindow: {
        name: 'FinderWindow',
        plural: 'FinderWindows',
        description: 'A file viewer window',
        code: 'brow',
        properties: {
          target: {
            access: 'rw',
            type: 'string',
            description: 'the container at which this file viewer is targeted',
            code: 'fvtg',
            optional: false,
          },
          currentView: {
            access: 'rw',
            type: 'string',
            description: 'the current view for the container window',
            code: 'pvew',
            optional: false,
          },
          iconViewOptions: {
            access: 'r',
            type: {
              resource: 'icon view options',
            },
            description: 'the icon view options for the container window',
            code: 'icop',
            optional: false,
          },
          listViewOptions: {
            access: 'r',
            type: {
              resource: 'list view options',
            },
            description: 'the list view options for the container window',
            code: 'lvop',
            optional: false,
          },
          columnViewOptions: {
            access: 'r',
            type: {
              resource: 'column view options',
            },
            description: 'the column view options for the container window',
            code: 'cvop',
            optional: false,
          },
          toolbarVisible: {
            access: 'rw',
            type: 'boolean',
            description: "Is the window's toolbar visible?",
            code: 'tbvi',
            optional: false,
          },
          statusbarVisible: {
            access: 'rw',
            type: 'boolean',
            description: "Is the window's status bar visible?",
            code: 'stvi',
            optional: false,
          },
          pathbarVisible: {
            access: 'rw',
            type: 'boolean',
            description: "Is the window's path bar visible?",
            code: 'pbvi',
            optional: false,
          },
          sidebarWidth: {
            access: 'rw',
            type: 'integer',
            description: 'the width of the sidebar for the container window',
            code: 'sbwi',
            optional: false,
          },
        },
      },
      ClippingWindow: {
        name: 'ClippingWindow',
        plural: 'ClippingWindows',
        description: 'The window containing a clipping',
        code: 'lwnd',
        properties: {
          id: {
            access: 'r',
            type: 'integer',
            description: 'Unique identifier for this window',
            code: 'ID  ',
            optional: false,
          },
        },
      },
      ListViewOptions: {
        name: 'ListViewOptions',
        plural: 'ListViewOptionss',
        description: 'the list view options',
        code: 'lvop',
        properties: {
          calculatesFolderSizes: {
            access: 'rw',
            type: 'boolean',
            description: 'Are folder sizes calculated and displayed in the window?',
            code: 'sfsz',
            optional: false,
          },
          showsIconPreview: {
            access: 'rw',
            type: 'boolean',
            description: 'displays a preview of the item in list view',
            code: 'prvw',
            optional: false,
          },
          iconSize: {
            access: 'rw',
            type: 'string',
            description: 'the size of icons displayed in the list view',
            code: 'lvis',
            optional: false,
          },
          textSize: {
            access: 'rw',
            type: 'integer',
            description: 'the size of the text displayed in the list view',
            code: 'fsiz',
            optional: false,
          },
          sortColumn: {
            access: 'rw',
            type: {
              resource: 'column',
            },
            description: 'the column that the list view is sorted on',
            code: 'srtc',
            optional: false,
          },
          usesRelativeDates: {
            access: 'rw',
            type: 'boolean',
            description: 'Are relative dates (e.g., today, yesterday) shown in the list view?',
            code: 'urdt',
            optional: false,
          },
        },
      },
      Column: {
        name: 'Column',
        plural: 'Columns',
        description: 'a column of a list view',
        code: 'lvcl',
        properties: {
          index: {
            access: 'rw',
            type: 'integer',
            description: 'the index in the front-to-back ordering within its container',
            code: 'pidx',
            optional: false,
          },
          name: {
            access: 'r',
            type: 'string',
            description: 'the column name',
            code: 'pnam',
            optional: false,
          },
          sortDirection: {
            access: 'rw',
            type: 'string',
            description: 'The direction in which the window is sorted',
            code: 'sord',
            optional: false,
          },
          width: {
            access: 'rw',
            type: 'integer',
            description: 'the width of this column',
            code: 'clwd',
            optional: false,
          },
          minimumWidth: {
            access: 'r',
            type: 'integer',
            description: 'the minimum allowed width of this column',
            code: 'clwn',
            optional: false,
          },
          maximumWidth: {
            access: 'r',
            type: 'integer',
            description: 'the maximum allowed width of this column',
            code: 'clwm',
            optional: false,
          },
          visible: {
            access: 'rw',
            type: 'boolean',
            description: 'is this column visible',
            code: 'pvis',
            optional: false,
          },
        },
      },
    },
    enums: {
      Priv: {
        name: 'Priv',
        code: 'priv',
        values: [
          {
            name: 'readOnly',
            value: 'readOnly',
            code: 'read',
          },
          {
            name: 'readWrite',
            value: 'readWrite',
            code: 'rdwr',
          },
          {
            name: 'writeOnly',
            value: 'writeOnly',
            code: 'writ',
          },
          {
            name: 'none',
            value: 'none',
            code: 'none',
          },
        ],
      },
      Edfm: {
        name: 'Edfm',
        code: 'edfm',
        values: [
          {
            name: 'macOSFormat',
            value: 'macOSFormat',
            code: 'dfhf',
          },
          {
            name: 'macOSExtendedFormat',
            value: 'macOSExtendedFormat',
            code: 'dfh+',
          },
          {
            name: 'uFSFormat',
            value: 'uFSFormat',
            code: 'dfuf',
          },
          {
            name: 'nFSFormat',
            value: 'nFSFormat',
            code: 'dfnf',
          },
          {
            name: 'audioFormat',
            value: 'audioFormat',
            code: 'dfau',
          },
          {
            name: 'proDOSFormat',
            value: 'proDOSFormat',
            code: 'dfpr',
          },
          {
            name: 'mSDOSFormat',
            value: 'mSDOSFormat',
            code: 'dfms',
          },
          {
            name: 'nTFSFormat',
            value: 'nTFSFormat',
            code: 'dfnt',
          },
          {
            name: 'iSO9660Format',
            value: 9660,
            code: 'df96',
          },
          {
            name: 'highSierraFormat',
            value: 'highSierraFormat',
            code: 'dfhs',
          },
          {
            name: 'quickTakeFormat',
            value: 'quickTakeFormat',
            code: 'dfqt',
          },
          {
            name: 'applePhotoFormat',
            value: 'applePhotoFormat',
            code: 'dfph',
          },
          {
            name: 'appleShareFormat',
            value: 'appleShareFormat',
            code: 'dfas',
          },
          {
            name: 'uDFFormat',
            value: 'uDFFormat',
            code: 'dfud',
          },
          {
            name: 'webDAVFormat',
            value: 'webDAVFormat',
            code: 'dfwd',
          },
          {
            name: 'fTPFormat',
            value: 'fTPFormat',
            code: 'dfft',
          },
          {
            name: 'packetWrittenUDFFormat',
            value: 'packetWrittenUDFFormat',
            code: 'dfpu',
          },
          {
            name: 'xsanFormat',
            value: 'xsanFormat',
            code: 'dfac',
          },
          {
            name: 'aPFSFormat',
            value: 'aPFSFormat',
            code: 'dfap',
          },
          {
            name: 'exFATFormat',
            value: 'exFATFormat',
            code: 'dfxf',
          },
          {
            name: 'sMBFormat',
            value: 'sMBFormat',
            code: 'dfsm',
          },
          {
            name: 'unknownFormat',
            value: 'unknownFormat',
            code: 'df??',
          },
        ],
      },
      Ipnl: {
        name: 'Ipnl',
        code: 'ipnl',
        values: [
          {
            name: 'generalInformationPanel',
            value: 'generalInformationPanel',
            code: 'gpnl',
          },
          {
            name: 'sharingPanel',
            value: 'sharingPanel',
            code: 'spnl',
          },
          {
            name: 'memoryPanel',
            value: 'memoryPanel',
            code: 'mpnl',
          },
          {
            name: 'previewPanel',
            value: 'previewPanel',
            code: 'vpnl',
          },
          {
            name: 'applicationPanel',
            value: 'applicationPanel',
            code: 'apnl',
          },
          {
            name: 'languagesPanel',
            value: 'languagesPanel',
            code: 'pklg',
          },
          {
            name: 'pluginsPanel',
            value: 'pluginsPanel',
            code: 'pkpg',
          },
          {
            name: 'nameExtensionPanel',
            value: 'nameExtensionPanel',
            code: 'npnl',
          },
          {
            name: 'commentsPanel',
            value: 'commentsPanel',
            code: 'cpnl',
          },
          {
            name: 'contentIndexPanel',
            value: 'contentIndexPanel',
            code: 'cinl',
          },
          {
            name: 'burningPanel',
            value: 'burningPanel',
            code: 'bpnl',
          },
          {
            name: 'moreInfoPanel',
            value: 'moreInfoPanel',
            code: 'minl',
          },
          {
            name: 'simpleHeaderPanel',
            value: 'simpleHeaderPanel',
            code: 'shnl',
          },
        ],
      },
      Pple: {
        name: 'Pple',
        code: 'pple',
        values: [
          {
            name: 'generalPreferencesPanel',
            value: 'generalPreferencesPanel',
            code: 'pgnp',
          },
          {
            name: 'labelPreferencesPanel',
            value: 'labelPreferencesPanel',
            code: 'plbp',
          },
          {
            name: 'sidebarPreferencesPanel',
            value: 'sidebarPreferencesPanel',
            code: 'psid',
          },
          {
            name: 'advancedPreferencesPanel',
            value: 'advancedPreferencesPanel',
            code: 'padv',
          },
        ],
      },
      Ecvw: {
        name: 'Ecvw',
        code: 'ecvw',
        values: [
          {
            name: 'iconView',
            value: 'iconView',
            code: 'icnv',
          },
          {
            name: 'listView',
            value: 'listView',
            code: 'lsvw',
          },
          {
            name: 'columnView',
            value: 'columnView',
            code: 'clvw',
          },
          {
            name: 'groupView',
            value: 'groupView',
            code: 'flvw',
          },
          {
            name: 'flowView',
            value: 'flowView',
            code: 'flvw',
          },
        ],
      },
      Earr: {
        name: 'Earr',
        code: 'earr',
        values: [
          {
            name: 'notArranged',
            value: 'notArranged',
            code: 'narr',
          },
          {
            name: 'snapToGrid',
            value: 'snapToGrid',
            code: 'grda',
          },
          {
            name: 'arrangedByName',
            value: 'arrangedByName',
            code: 'nama',
          },
          {
            name: 'arrangedByModificationDate',
            value: 'arrangedByModificationDate',
            code: 'mdta',
          },
          {
            name: 'arrangedByCreationDate',
            value: 'arrangedByCreationDate',
            code: 'cdta',
          },
          {
            name: 'arrangedBySize',
            value: 'arrangedBySize',
            code: 'siza',
          },
          {
            name: 'arrangedByKind',
            value: 'arrangedByKind',
            code: 'kina',
          },
          {
            name: 'arrangedByLabel',
            value: 'arrangedByLabel',
            code: 'laba',
          },
        ],
      },
      Epos: {
        name: 'Epos',
        code: 'epos',
        values: [
          {
            name: 'right',
            value: 'right',
            code: 'lrgt',
          },
          {
            name: 'bottom',
            value: 'bottom',
            code: 'lbot',
          },
        ],
      },
      Sodr: {
        name: 'Sodr',
        code: 'sodr',
        values: [
          {
            name: 'normal',
            value: 'normal',
            code: 'snrm',
          },
          {
            name: 'reversed',
            value: 'reversed',
            code: 'srvs',
          },
        ],
      },
      Elsv: {
        name: 'Elsv',
        code: 'elsv',
        values: [
          {
            name: 'nameColumn',
            value: 'nameColumn',
            code: 'elsn',
          },
          {
            name: 'modificationDateColumn',
            value: 'modificationDateColumn',
            code: 'elsm',
          },
          {
            name: 'creationDateColumn',
            value: 'creationDateColumn',
            code: 'elsc',
          },
          {
            name: 'sizeColumn',
            value: 'sizeColumn',
            code: 'elss',
          },
          {
            name: 'kindColumn',
            value: 'kindColumn',
            code: 'elsk',
          },
          {
            name: 'labelColumn',
            value: 'labelColumn',
            code: 'elsl',
          },
          {
            name: 'versionColumn',
            value: 'versionColumn',
            code: 'elsv',
          },
          {
            name: 'commentColumn',
            value: 'commentColumn',
            code: 'elsC',
          },
        ],
      },
      Lvic: {
        name: 'Lvic',
        code: 'lvic',
        values: [
          {
            name: 'smallIcon',
            value: 'smallIcon',
            code: 'smic',
          },
          {
            name: 'largeIcon',
            value: 'largeIcon',
            code: 'lgic',
          },
        ],
      },
      Isiz: {
        name: 'Isiz',
        code: 'isiz',
        values: [
          {
            name: 'mini',
            value: 'mini',
            code: 'miic',
          },
          {
            name: 'small',
            value: 'small',
            code: 'smic',
          },
          {
            name: 'large',
            value: 'large',
            code: 'lgic',
          },
        ],
      },
      Sort: {
        name: 'Sort',
        code: 'sort',
        values: [
          {
            name: 'name',
            value: 'name',
            code: 'pnam',
          },
          {
            name: 'modificationDate',
            value: 'modificationDate',
            code: 'asmo',
          },
          {
            name: 'creationDate',
            value: 'creationDate',
            code: 'ascd',
          },
          {
            name: 'size',
            value: 'size',
            code: 'phys',
          },
          {
            name: 'kind',
            value: 'kind',
            code: 'kind',
          },
          {
            name: 'labelIndex',
            value: 'labelIndex',
            code: 'labi',
          },
          {
            name: 'comment',
            value: 'comment',
            code: 'comt',
          },
          {
            name: 'version',
            value: 'version',
            code: 'vers',
          },
        ],
      },
    },
    hierarchy: {
      children: {
        disks: {
          resource: 'Disk',
          access: 'r',
          description: 'A disk',
        },
      },
    },
    relationships: [],
    commands: {
      open: {
        name: 'open',
        description: 'Open the specified object(s)',
        scope: 'application',
        parameters: [
          {
            name: 'using',
            type: 'string',
            description: 'the application file to open the object with',
            required: false,
            code: 'usin',
          },
          {
            name: 'withProperties',
            type: 'any',
            description:
              'the initial values for the properties, to be included with the open command sent to the application that opens the direct object',
            required: false,
            code: 'prdt',
          },
        ],
        code: 'odoc',
      },
      print: {
        name: 'print',
        description: 'Print the specified object(s)',
        scope: 'application',
        parameters: [
          {
            name: 'withProperties',
            type: 'any',
            description:
              'optional properties to be included with the print command sent to the application that prints the direct object',
            required: false,
            code: 'prdt',
          },
        ],
        code: 'pdoc',
      },
      quit: {
        name: 'quit',
        description: 'Quit the Finder',
        scope: 'application',
        parameters: [],
        code: 'quit',
      },
      activate: {
        name: 'activate',
        description: 'Activate the specified window (or the Finder)',
        scope: 'application',
        parameters: [],
        code: 'actv',
      },
      close: {
        name: 'close',
        description: 'Close an object',
        scope: 'application',
        parameters: [],
        code: 'clos',
      },
      count: {
        name: 'count',
        description: 'Return the number of elements of a particular class within an object',
        scope: 'application',
        parameters: [
          {
            name: 'each',
            type: 'string',
            description: 'the class of the elements to be counted',
            required: true,
            code: 'kocl',
          },
        ],
        code: 'cnte',
      },
      dataSize: {
        name: 'dataSize',
        description: 'Return the size in bytes of an object',
        scope: 'application',
        parameters: [
          {
            name: 'as',
            type: 'string',
            description: 'the data type for which the size is calculated',
            required: false,
            code: 'rtyp',
          },
        ],
        code: 'dsiz',
      },
      delete: {
        name: 'delete',
        description: 'Move an item from its container to the trash',
        scope: 'application',
        parameters: [],
        code: 'delo',
      },
      duplicate: {
        name: 'duplicate',
        description: 'Duplicate one or more object(s)',
        scope: 'application',
        parameters: [
          {
            name: 'to',
            type: 'string',
            description: 'the new location for the object(s)',
            required: false,
            code: 'insh',
          },
          {
            name: 'replacing',
            type: 'boolean',
            description:
              'Specifies whether or not to replace items in the destination that have the same name as items being duplicated',
            required: false,
            code: 'alrp',
          },
          {
            name: 'routingSuppressed',
            type: 'boolean',
            description:
              'Specifies whether or not to autoroute items (default is false). Only applies when copying to the system folder.',
            required: false,
            code: 'rout',
          },
          {
            name: 'exactCopy',
            type: 'boolean',
            description: 'Specifies whether or not to copy permissions/ownership as is',
            required: false,
            code: 'exct',
          },
        ],
        code: 'clon',
      },
      exists: {
        name: 'exists',
        description: 'Verify if an object exists',
        scope: 'application',
        parameters: [],
        code: 'doex',
      },
      make: {
        name: 'make',
        description: 'Make a new element',
        scope: 'application',
        parameters: [
          {
            name: 'new',
            type: 'string',
            description: 'the class of the new element',
            required: true,
            code: 'kocl',
          },
          {
            name: 'at',
            type: 'string',
            description: 'the location at which to insert the element',
            required: true,
            code: 'insh',
          },
          {
            name: 'to',
            type: 'string',
            description:
              'when creating an alias file, the original item to create an alias to or when creating a file viewer window, the target of the window',
            required: false,
            code: 'to',
          },
          {
            name: 'withProperties',
            type: 'any',
            description: 'the initial values for the properties of the element',
            required: false,
            code: 'prdt',
          },
        ],
        code: 'crel',
      },
      move: {
        name: 'move',
        description: 'Move object(s) to a new location',
        scope: 'application',
        parameters: [
          {
            name: 'to',
            type: 'string',
            description: 'the new location for the object(s)',
            required: true,
            code: 'insh',
          },
          {
            name: 'replacing',
            type: 'boolean',
            description:
              'Specifies whether or not to replace items in the destination that have the same name as items being moved',
            required: false,
            code: 'alrp',
          },
          {
            name: 'positionedAt',
            type: 'string',
            description:
              'Gives a list (in local window coordinates) of positions for the destination items',
            required: false,
            code: 'mvpl',
          },
          {
            name: 'routingSuppressed',
            type: 'boolean',
            description:
              'Specifies whether or not to autoroute items (default is false). Only applies when moving to the system folder.',
            required: false,
            code: 'rout',
          },
        ],
        code: 'move',
      },
      select: {
        name: 'select',
        description: 'Select the specified object(s)',
        scope: 'application',
        parameters: [],
        code: 'slct',
      },
      openVirtualLocation: {
        name: 'openVirtualLocation',
        description: 'Private event to open a virtual location',
        scope: 'application',
        parameters: [],
        code: 'ovir',
      },
      copy: {
        name: 'copy',
        description:
          '(NOT AVAILABLE YET) Copy the selected items to the clipboard (the Finder must be the front application)',
        scope: 'application',
        parameters: [],
        code: 'copy',
      },
      sort: {
        name: 'sort',
        description: 'Return the specified object(s) in a sorted list',
        scope: 'application',
        parameters: [
          {
            name: 'by',
            type: 'string',
            description: 'the property to sort the items by (name, index, date, etc.)',
            required: true,
            code: 'by',
          },
        ],
        code: 'SORT',
      },
      cleanUp: {
        name: 'cleanUp',
        description:
          'Arrange items in window nicely (only applies to open windows in icon view that are not kept arranged)',
        scope: 'application',
        parameters: [
          {
            name: 'by',
            type: 'string',
            description: 'the order in which to clean up the objects (name, index, date, etc.)',
            required: false,
            code: 'by',
          },
        ],
        code: 'fclu',
      },
      eject: {
        name: 'eject',
        description: 'Eject the specified disk(s)',
        scope: 'application',
        parameters: [],
        code: 'ejct',
      },
      empty: {
        name: 'empty',
        description: 'Empty the trash',
        scope: 'application',
        parameters: [
          {
            name: 'security',
            type: 'boolean',
            description: '(obsolete)',
            required: false,
            code: 'sec?',
          },
        ],
        code: 'empt',
      },
      erase: {
        name: 'erase',
        description: '(NOT AVAILABLE) Erase the specified disk(s)',
        scope: 'application',
        parameters: [],
        code: 'fera',
      },
      reveal: {
        name: 'reveal',
        description: 'Bring the specified object(s) into view',
        scope: 'application',
        parameters: [],
        code: 'mvis',
      },
      update: {
        name: 'update',
        description:
          'Update the display of the specified object(s) to match their on-disk representation',
        scope: 'application',
        parameters: [
          {
            name: 'necessity',
            type: 'boolean',
            description:
              'only update if necessary (i.e. a finder window is open). default is false',
            required: false,
            code: 'nec?',
          },
          {
            name: 'registeringApplications',
            type: 'boolean',
            description: 'register applications. default is true',
            required: false,
            code: 'reg?',
          },
        ],
        code: 'fupd',
      },
      restart: {
        name: 'restart',
        description: 'Restart the computer',
        scope: 'application',
        parameters: [],
        code: 'rest',
      },
      shutDown: {
        name: 'shutDown',
        description: 'Shut Down the computer',
        scope: 'application',
        parameters: [],
        code: 'shut',
      },
      sleep: {
        name: 'sleep',
        description: 'Put the computer to sleep',
        scope: 'application',
        parameters: [],
        code: 'slep',
      },
    },
  } as AppManifest,
} as const
