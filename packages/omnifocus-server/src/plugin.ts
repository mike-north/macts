/**
 * API plugin for OmniFocus.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for OmniFocus.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for OmniFocus.app automation.
 */
export const omniFocusApiPlugin = {
  name: 'omnifocus',
  bundleId: 'com.omnigroup.OmniFocus4',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.omnigroup.OmniFocus4",
    "name": "OmniFocus",
    "displayName": "OmniFocus",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "developer-id"
  },
  "suites": [
    {
      "name": "Standard Suite",
      "description": "Common classes and commands for all applications",
      "code": "????",
      "resources": [],
      "commands": [],
      "enums": []
    },
    {
      "name": "OmniFocus suite",
      "description": "AppleScript commands and classes specific to OmniFocus",
      "code": "OFOC",
      "resources": [
        "Task",
        "Project",
        "Folder",
        "Tag",
        "InboxTask",
        "Perspective"
      ],
      "commands": [
        "complete",
        "markComplete",
        "markIncomplete",
        "markDropped",
        "parseTasksInto",
        "archive",
        "compact",
        "synchronize",
        "importInto",
        "undo",
        "redo"
      ],
      "enums": [
        "ProjectStatus",
        "IntervalUnit",
        "RepetitionMethod",
        "RepetitionSchedule",
        "RepetitionBasedOn"
      ]
    }
  ],
  "resources": {
    "Task": {
      "name": "Task",
      "plural": "Tasks",
      "description": "A task within OmniFocus",
      "code": "FCac",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the task",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the task",
          "code": "pnam",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "The note of the task",
          "code": "FCno",
          "optional": false
        },
        "flagged": {
          "access": "rw",
          "type": "boolean",
          "description": "True if flagged",
          "code": "FCfl",
          "optional": false
        },
        "completed": {
          "access": "r",
          "type": "boolean",
          "description": "True if the task is completed",
          "code": "FCcd",
          "optional": false
        },
        "deferDate": {
          "access": "rw",
          "type": "date",
          "description": "When the task should become available for action",
          "code": "FCDs",
          "optional": false
        },
        "plannedDate": {
          "access": "rw",
          "type": "date",
          "description": "The date at which work for this task is intended",
          "code": "FCDp",
          "optional": false
        },
        "dueDate": {
          "access": "rw",
          "type": "date",
          "description": "When the task must be finished",
          "code": "FCDd",
          "optional": false
        },
        "completionDate": {
          "access": "rw",
          "type": "date",
          "description": "The task's date of completion",
          "code": "FCdc",
          "optional": false
        },
        "droppedDate": {
          "access": "rw",
          "type": "date",
          "description": "The date the task was dropped",
          "code": "FCd-",
          "optional": false
        },
        "creationDate": {
          "access": "rw",
          "type": "date",
          "description": "When the task was created",
          "code": "FCDa",
          "optional": false
        },
        "modificationDate": {
          "access": "r",
          "type": "date",
          "description": "When the task was last modified",
          "code": "FCDm",
          "optional": false
        },
        "estimatedMinutes": {
          "access": "rw",
          "type": "integer",
          "description": "The estimated time, in whole minutes, that this task will take to finish",
          "code": "FCEM",
          "optional": false
        },
        "sequential": {
          "access": "rw",
          "type": "boolean",
          "description": "If true, any children are sequentially dependent",
          "code": "FCsq",
          "optional": false
        },
        "completedByChildren": {
          "access": "rw",
          "type": "boolean",
          "description": "If true, complete when children are completed",
          "code": "FCbc",
          "optional": false
        },
        "inInbox": {
          "access": "r",
          "type": "boolean",
          "description": "Returns true if the task itself is an inbox task or if the task is contained by an inbox task",
          "code": "FCIi",
          "optional": false
        },
        "next": {
          "access": "r",
          "type": "boolean",
          "description": "If the task is the next task of its containing project, next is true",
          "code": "FCnx",
          "optional": false
        },
        "blocked": {
          "access": "r",
          "type": "boolean",
          "description": "True if the task has a task that must be completed prior to it being actionable",
          "code": "FCBl",
          "optional": false
        },
        "effectiveDeferDate": {
          "access": "r",
          "type": "date",
          "description": "When the task should become available for action (including inherited)",
          "code": "FCse",
          "optional": false
        },
        "effectivePlannedDate": {
          "access": "r",
          "type": "date",
          "description": "The date at which work for this task is intended (including inherited)",
          "code": "FCpe",
          "optional": false
        },
        "effectiveDueDate": {
          "access": "r",
          "type": "date",
          "description": "When the task must be finished (including inherited)",
          "code": "FCde",
          "optional": false
        },
        "effectivelyCompleted": {
          "access": "r",
          "type": "boolean",
          "description": "True if the task is completed, or any of its containing tasks or project are completed",
          "code": "FCce",
          "optional": false
        },
        "effectivelyDropped": {
          "access": "r",
          "type": "boolean",
          "description": "True if the task is dropped, or any of its containing tasks or project are dropped",
          "code": "FC-e",
          "optional": false
        },
        "dropped": {
          "access": "r",
          "type": "boolean",
          "description": "True if the task is dropped",
          "code": "FC-d",
          "optional": false
        },
        "numberOfTasks": {
          "access": "r",
          "type": "integer",
          "description": "The number of direct children of this task",
          "code": "FC#t",
          "optional": false
        },
        "numberOfAvailableTasks": {
          "access": "r",
          "type": "integer",
          "description": "The number of available direct children of this task",
          "code": "FC#a",
          "optional": false
        },
        "numberOfCompletedTasks": {
          "access": "r",
          "type": "integer",
          "description": "The number of completed direct children of this task",
          "code": "FC#c",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Project": {
      "name": "Project",
      "plural": "Projects",
      "description": "A project in OmniFocus",
      "code": "FCpr",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the project",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the project",
          "code": "pnam",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "The note of the project",
          "code": "FCno",
          "optional": false
        },
        "status": {
          "access": "rw",
          "type": {
            "enum": "ProjectStatus"
          },
          "description": "The status of the project",
          "code": "FCPs",
          "optional": false
        },
        "effectiveStatus": {
          "access": "r",
          "type": {
            "enum": "ProjectStatus"
          },
          "description": "The effective status of the project",
          "code": "FCPS",
          "optional": false
        },
        "flagged": {
          "access": "rw",
          "type": "boolean",
          "description": "True if flagged",
          "code": "FCfl",
          "optional": false
        },
        "completed": {
          "access": "r",
          "type": "boolean",
          "description": "True if the project is completed",
          "code": "FCcd",
          "optional": false
        },
        "deferDate": {
          "access": "rw",
          "type": "date",
          "description": "When the project should become available for action",
          "code": "FCDs",
          "optional": false
        },
        "plannedDate": {
          "access": "rw",
          "type": "date",
          "description": "The date at which work for this project is intended",
          "code": "FCDp",
          "optional": false
        },
        "dueDate": {
          "access": "rw",
          "type": "date",
          "description": "When the project must be finished",
          "code": "FCDd",
          "optional": false
        },
        "completionDate": {
          "access": "rw",
          "type": "date",
          "description": "The project's date of completion",
          "code": "FCdc",
          "optional": false
        },
        "droppedDate": {
          "access": "rw",
          "type": "date",
          "description": "The date the project was dropped",
          "code": "FCd-",
          "optional": false
        },
        "creationDate": {
          "access": "rw",
          "type": "date",
          "description": "When the project was created",
          "code": "FCDa",
          "optional": false
        },
        "modificationDate": {
          "access": "r",
          "type": "date",
          "description": "When the project was last modified",
          "code": "FCDm",
          "optional": false
        },
        "lastReviewDate": {
          "access": "rw",
          "type": "date",
          "description": "When the project was last reviewed",
          "code": "FCDr",
          "optional": false
        },
        "nextReviewDate": {
          "access": "rw",
          "type": "date",
          "description": "When the project should next be reviewed",
          "code": "FCDR",
          "optional": false
        },
        "estimatedMinutes": {
          "access": "rw",
          "type": "integer",
          "description": "The estimated time, in whole minutes, that this project will take to finish",
          "code": "FCEM",
          "optional": false
        },
        "sequential": {
          "access": "rw",
          "type": "boolean",
          "description": "If true, any children are sequentially dependent",
          "code": "FCsq",
          "optional": false
        },
        "completedByChildren": {
          "access": "rw",
          "type": "boolean",
          "description": "If true, complete when children are completed",
          "code": "FCbc",
          "optional": false
        },
        "singletonActionHolder": {
          "access": "rw",
          "type": "boolean",
          "description": "True if the project contains singleton actions",
          "code": "FC.A",
          "optional": false
        },
        "defaultSingletonActionHolder": {
          "access": "rw",
          "type": "boolean",
          "description": "True if the project is the default holder of singleton actions",
          "code": "FCd.",
          "optional": false
        },
        "blocked": {
          "access": "r",
          "type": "boolean",
          "description": "True if the project has a project that must be completed prior to it being actionable",
          "code": "FCBl",
          "optional": false
        },
        "effectiveDeferDate": {
          "access": "r",
          "type": "date",
          "description": "When the project should become available for action (including inherited)",
          "code": "FCse",
          "optional": false
        },
        "effectivePlannedDate": {
          "access": "r",
          "type": "date",
          "description": "The date at which work for this project is intended (including inherited)",
          "code": "FCpe",
          "optional": false
        },
        "effectiveDueDate": {
          "access": "r",
          "type": "date",
          "description": "When the project must be finished (including inherited)",
          "code": "FCde",
          "optional": false
        },
        "effectivelyCompleted": {
          "access": "r",
          "type": "boolean",
          "description": "True if the project is completed",
          "code": "FCce",
          "optional": false
        },
        "effectivelyDropped": {
          "access": "r",
          "type": "boolean",
          "description": "True if the project is dropped",
          "code": "FC-e",
          "optional": false
        },
        "dropped": {
          "access": "r",
          "type": "boolean",
          "description": "True if the project is dropped",
          "code": "FC-d",
          "optional": false
        },
        "numberOfTasks": {
          "access": "r",
          "type": "integer",
          "description": "The number of direct children of this project",
          "code": "FC#t",
          "optional": false
        },
        "numberOfAvailableTasks": {
          "access": "r",
          "type": "integer",
          "description": "The number of available direct children of this project",
          "code": "FC#a",
          "optional": false
        },
        "numberOfCompletedTasks": {
          "access": "r",
          "type": "integer",
          "description": "The number of completed direct children of this project",
          "code": "FC#c",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Folder": {
      "name": "Folder",
      "plural": "Folders",
      "description": "A group of projects and sub-folders representing an area of responsibility",
      "code": "FCAr",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the folder",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the folder",
          "code": "pnam",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "The note of the folder",
          "code": "FCno",
          "optional": false
        },
        "hidden": {
          "access": "rw",
          "type": "boolean",
          "description": "Set if the folder is currently hidden",
          "code": "FCHi",
          "optional": false
        },
        "effectivelyHidden": {
          "access": "r",
          "type": "boolean",
          "description": "Set if the folder is currently hidden or any of its container folders are hidden",
          "code": "FCHe",
          "optional": false
        },
        "creationDate": {
          "access": "r",
          "type": "date",
          "description": "When the folder was created",
          "code": "FCDa",
          "optional": false
        },
        "modificationDate": {
          "access": "r",
          "type": "date",
          "description": "When the folder was last modified",
          "code": "FCDm",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Tag": {
      "name": "Tag",
      "plural": "Tags",
      "description": "A tag for organizing and filtering tasks",
      "code": "FCtg",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the tag",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the tag",
          "code": "pnam",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "The note of the tag",
          "code": "FCno",
          "optional": false
        },
        "allowsNextAction": {
          "access": "rw",
          "type": "boolean",
          "description": "If false, tasks associated with this tag will be skipped when determining the next action for a project",
          "code": "FCNA",
          "optional": false
        },
        "hidden": {
          "access": "rw",
          "type": "boolean",
          "description": "Set if the tag is currently hidden",
          "code": "FCHi",
          "optional": false
        },
        "effectivelyHidden": {
          "access": "r",
          "type": "boolean",
          "description": "Set if the tag is currently hidden or any of its container tags are hidden",
          "code": "FCHe",
          "optional": false
        },
        "availableTaskCount": {
          "access": "r",
          "type": "integer",
          "description": "The number of available tasks",
          "code": "FC#a",
          "optional": false
        },
        "remainingTaskCount": {
          "access": "r",
          "type": "integer",
          "description": "The number of remaining tasks",
          "code": "FC#r",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "InboxTask": {
      "name": "InboxTask",
      "plural": "InboxTasks",
      "description": "A task that is in the document's inbox",
      "code": "FCit",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the inbox task",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the inbox task",
          "code": "pnam",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "The note of the inbox task",
          "code": "FCno",
          "optional": false
        },
        "flagged": {
          "access": "rw",
          "type": "boolean",
          "description": "True if flagged",
          "code": "FCfl",
          "optional": false
        },
        "deferDate": {
          "access": "rw",
          "type": "date",
          "description": "When the task should become available for action",
          "code": "FCDs",
          "optional": false
        },
        "dueDate": {
          "access": "rw",
          "type": "date",
          "description": "When the task must be finished",
          "code": "FCDd",
          "optional": false
        },
        "creationDate": {
          "access": "rw",
          "type": "date",
          "description": "When the task was created",
          "code": "FCDa",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Perspective": {
      "name": "Perspective",
      "plural": "Perspectives",
      "description": "A saved view or filter configuration",
      "code": "FCoo",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the perspective",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "r",
          "type": "string",
          "description": "The name of the perspective",
          "code": "pnam",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    }
  },
  "enums": {
    "ProjectStatus": {
      "name": "ProjectStatus",
      "description": "Status of a project",
      "code": "FCPs",
      "values": [
        {
          "name": "active",
          "value": "active",
          "description": "Active",
          "code": "FCPa"
        },
        {
          "name": "onHold",
          "value": "onHold",
          "description": "On Hold",
          "code": "FCPh"
        },
        {
          "name": "done",
          "value": "done",
          "description": "Done",
          "code": "FCPd"
        },
        {
          "name": "dropped",
          "value": "dropped",
          "description": "Dropped",
          "code": "FCPD"
        }
      ]
    },
    "IntervalUnit": {
      "name": "IntervalUnit",
      "description": "Unit for time intervals",
      "code": "FCIu",
      "values": [
        {
          "name": "minute",
          "value": "minute",
          "description": "Minutes",
          "code": "FCIM"
        },
        {
          "name": "hour",
          "value": "hour",
          "description": "Hours",
          "code": "FCIH"
        },
        {
          "name": "day",
          "value": "day",
          "description": "Days",
          "code": "FCId"
        },
        {
          "name": "week",
          "value": "week",
          "description": "Weeks",
          "code": "FCIw"
        },
        {
          "name": "month",
          "value": "month",
          "description": "Months",
          "code": "FCIm"
        },
        {
          "name": "year",
          "value": "year",
          "description": "Years",
          "code": "FCIy"
        }
      ]
    },
    "RepetitionMethod": {
      "name": "RepetitionMethod",
      "description": "Method for task repetition",
      "code": "FRmM",
      "values": [
        {
          "name": "fixedRepetition",
          "value": "fixedRepetition",
          "description": "Repeat on a fixed schedule",
          "code": "FRmF"
        },
        {
          "name": "startAfterCompletion",
          "value": "startAfterCompletion",
          "description": "Start again after completion",
          "code": "FRmS"
        },
        {
          "name": "dueAfterCompletion",
          "value": "dueAfterCompletion",
          "description": "Due again after completion",
          "code": "FRmD"
        }
      ]
    },
    "RepetitionSchedule": {
      "name": "RepetitionSchedule",
      "description": "Schedule type for repetition",
      "code": "FRsT",
      "values": [
        {
          "name": "regularly",
          "value": "regularly",
          "description": "Repeat on a regular schedule based on the assigned dates",
          "code": "FRsR"
        },
        {
          "name": "fromCompletion",
          "value": "fromCompletion",
          "description": "Repeat from resolution",
          "code": "FRmC"
        }
      ]
    },
    "RepetitionBasedOn": {
      "name": "RepetitionBasedOn",
      "description": "Which date property to base repetition on",
      "code": "FRsK",
      "values": [
        {
          "name": "basedOnDue",
          "value": "basedOnDue",
          "description": "The repetition is based on the action's due date",
          "code": "FRsD"
        },
        {
          "name": "basedOnPlanned",
          "value": "basedOnPlanned",
          "description": "The repetition is based on the action's planned date",
          "code": "FRsP"
        },
        {
          "name": "basedOnDefer",
          "value": "basedOnDefer",
          "description": "The repetition is based on the action's defer date",
          "code": "FRsd"
        }
      ]
    }
  },
  "hierarchy": {
    "children": {
      "folders": {
        "resource": "Folder",
        "access": "rw",
        "description": "Folders in the document",
        "children": {
          "folders": {
            "resource": "Folder",
            "access": "rw",
            "description": "Sub-folders within a folder"
          },
          "projects": {
            "resource": "Project",
            "access": "rw",
            "description": "Projects within a folder"
          }
        }
      },
      "projects": {
        "resource": "Project",
        "access": "rw",
        "description": "Projects at the document root",
        "children": {
          "tasks": {
            "resource": "Task",
            "access": "rw",
            "description": "Tasks within a project",
            "children": {
              "tasks": {
                "resource": "Task",
                "access": "rw",
                "description": "Subtasks within a task"
              }
            }
          }
        }
      },
      "tags": {
        "resource": "Tag",
        "access": "rw",
        "description": "Tags in the document",
        "children": {
          "tags": {
            "resource": "Tag",
            "access": "rw",
            "description": "Sub-tags within a tag"
          }
        }
      },
      "inboxTasks": {
        "resource": "InboxTask",
        "access": "rw",
        "description": "Tasks in the inbox"
      },
      "perspectives": {
        "resource": "Perspective",
        "access": "r",
        "description": "Available perspectives"
      }
    }
  },
  "relationships": [],
  "commands": {
    "listFolders": {
      "name": "list",
      "description": "List all folders",
      "scope": "resource",
      "resourceType": "Folder",
      "parameters": [],
      "code": "core",
      "permission": "omnifocus:folders:list"
    },
    "getFolder": {
      "name": "get",
      "description": "Get a folder by ID",
      "scope": "resource",
      "resourceType": "Folder",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Folder identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omnifocus:folders:get"
    },
    "createFolder": {
      "name": "create",
      "description": "Create a new folder",
      "scope": "resource",
      "resourceType": "Folder",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Folder name",
          "required": true
        },
        {
          "name": "note",
          "type": "string",
          "description": "Folder note",
          "required": false
        }
      ],
      "code": "crel",
      "permission": "omnifocus:folders:create"
    },
    "listProjects": {
      "name": "list",
      "description": "List all projects",
      "scope": "resource",
      "resourceType": "Project",
      "parameters": [],
      "code": "core",
      "permission": "omnifocus:projects:list"
    },
    "getProject": {
      "name": "get",
      "description": "Get a project by ID",
      "scope": "resource",
      "resourceType": "Project",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Project identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omnifocus:projects:get"
    },
    "createProject": {
      "name": "create",
      "description": "Create a new project",
      "scope": "resource",
      "resourceType": "Project",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Project name",
          "required": true
        },
        {
          "name": "note",
          "type": "string",
          "description": "Project note",
          "required": false
        },
        {
          "name": "status",
          "type": "ProjectStatus",
          "description": "Project status",
          "required": false
        }
      ],
      "code": "crel",
      "permission": "omnifocus:projects:create"
    },
    "listTasks": {
      "name": "list",
      "description": "List all tasks",
      "scope": "resource",
      "resourceType": "Task",
      "parameters": [],
      "code": "core",
      "permission": "omnifocus:tasks:list"
    },
    "getTask": {
      "name": "get",
      "description": "Get a task by ID",
      "scope": "resource",
      "resourceType": "Task",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Task identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omnifocus:tasks:get"
    },
    "createTask": {
      "name": "create",
      "description": "Create a new task",
      "scope": "resource",
      "resourceType": "Task",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Task name",
          "required": true
        },
        {
          "name": "note",
          "type": "string",
          "description": "Task note",
          "required": false
        },
        {
          "name": "deferDate",
          "type": "date",
          "description": "Defer date",
          "required": false
        },
        {
          "name": "dueDate",
          "type": "date",
          "description": "Due date",
          "required": false
        }
      ],
      "code": "crel",
      "permission": "omnifocus:tasks:create"
    },
    "listTags": {
      "name": "list",
      "description": "List all tags",
      "scope": "resource",
      "resourceType": "Tag",
      "parameters": [],
      "code": "core",
      "permission": "omnifocus:tags:list"
    },
    "getTag": {
      "name": "get",
      "description": "Get a tag by ID",
      "scope": "resource",
      "resourceType": "Tag",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Tag identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omnifocus:tags:get"
    },
    "createTag": {
      "name": "create",
      "description": "Create a new tag",
      "scope": "resource",
      "resourceType": "Tag",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Tag name",
          "required": true
        }
      ],
      "code": "crel",
      "permission": "omnifocus:tags:create"
    },
    "listInboxTasks": {
      "name": "list",
      "description": "List all inbox tasks",
      "scope": "resource",
      "resourceType": "InboxTask",
      "parameters": [],
      "code": "core",
      "permission": "omnifocus:inboxTasks:list"
    },
    "getInboxTask": {
      "name": "get",
      "description": "Get an inbox task by ID",
      "scope": "resource",
      "resourceType": "InboxTask",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Inbox task identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omnifocus:inboxTasks:get"
    },
    "createInboxTask": {
      "name": "create",
      "description": "Create a new inbox task",
      "scope": "resource",
      "resourceType": "InboxTask",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Task name",
          "required": true
        },
        {
          "name": "note",
          "type": "string",
          "description": "Task note",
          "required": false
        }
      ],
      "code": "crel",
      "permission": "omnifocus:inboxTasks:create"
    },
    "listPerspectives": {
      "name": "list",
      "description": "List all perspectives",
      "scope": "resource",
      "resourceType": "Perspective",
      "parameters": [],
      "code": "core",
      "permission": "omnifocus:perspectives:list"
    },
    "getPerspective": {
      "name": "get",
      "description": "Get a perspective by ID",
      "scope": "resource",
      "resourceType": "Perspective",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Perspective identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omnifocus:perspectives:get"
    },
    "complete": {
      "name": "complete",
      "description": "Generate a list of completions given a string",
      "scope": "application",
      "parameters": [
        {
          "name": "text",
          "type": "string",
          "description": "Text to complete",
          "required": true
        }
      ],
      "code": "FCCm",
      "permission": "omnifocus:app:complete"
    },
    "markComplete": {
      "name": "markComplete",
      "description": "Mark one or more projects or tasks complete",
      "scope": "application",
      "parameters": [
        {
          "name": "targets",
          "type": "string",
          "description": "Objects to mark complete",
          "required": true
        }
      ],
      "code": "FCMc",
      "permission": "omnifocus:app:markComplete"
    },
    "markIncomplete": {
      "name": "markIncomplete",
      "description": "Mark one or more projects or tasks incomplete",
      "scope": "application",
      "parameters": [
        {
          "name": "targets",
          "type": "string",
          "description": "Objects to mark incomplete",
          "required": true
        }
      ],
      "code": "FCMi",
      "permission": "omnifocus:app:markIncomplete"
    },
    "markDropped": {
      "name": "markDropped",
      "description": "Mark one or more projects or tasks as dropped",
      "scope": "application",
      "parameters": [
        {
          "name": "targets",
          "type": "string",
          "description": "Objects to mark dropped",
          "required": true
        }
      ],
      "code": "FCMd",
      "permission": "omnifocus:app:markDropped"
    },
    "parseTasksInto": {
      "name": "parseTasksInto",
      "description": "Converts a textual representation of tasks into tasks",
      "scope": "application",
      "parameters": [
        {
          "name": "text",
          "type": "string",
          "description": "Text to parse",
          "required": true
        },
        {
          "name": "into",
          "type": "string",
          "description": "Target container",
          "required": true
        }
      ],
      "code": "FCP?",
      "permission": "omnifocus:app:parseTasksInto"
    },
    "archive": {
      "name": "archive",
      "description": "Write a backup archive of the document",
      "scope": "application",
      "parameters": [
        {
          "name": "in",
          "type": "string",
          "description": "The file in which to archive the document",
          "required": true
        },
        {
          "name": "compression",
          "type": "boolean",
          "description": "Should the archive be written with data compression enabled",
          "required": false
        }
      ],
      "code": "FCbk",
      "permission": "omnifocus:app:archive"
    },
    "compact": {
      "name": "compact",
      "description": "Hides completed tasks and processes any inbox items",
      "scope": "application",
      "parameters": [],
      "code": "FC><",
      "permission": "omnifocus:app:compact"
    },
    "synchronize": {
      "name": "synchronize",
      "description": "Synchronizes with the shared OmniFocus sync database",
      "scope": "application",
      "parameters": [],
      "code": "FCsy",
      "permission": "omnifocus:app:synchronize"
    },
    "importInto": {
      "name": "importInto",
      "description": "Imports a file into an existing OmniFocus document",
      "scope": "application",
      "parameters": [
        {
          "name": "file",
          "type": "string",
          "description": "File to import",
          "required": true
        }
      ],
      "code": "FC <",
      "permission": "omnifocus:app:importInto"
    },
    "undo": {
      "name": "undo",
      "description": "Undo the last command",
      "scope": "application",
      "parameters": [],
      "code": "FCUd",
      "permission": "omnifocus:app:undo"
    },
    "redo": {
      "name": "redo",
      "description": "Redo the last undone command",
      "scope": "application",
      "parameters": [],
      "code": "FCRd",
      "permission": "omnifocus:app:redo"
    }
  },
  "permissions": {
    "folders": {
      "read": [
        "omnifocus:folders:list",
        "omnifocus:folders:get"
      ],
      "create": [
        "omnifocus:folders:create"
      ],
      "write": [
        "omnifocus:folders:update"
      ],
      "delete": [
        "omnifocus:folders:delete"
      ]
    },
    "projects": {
      "read": [
        "omnifocus:projects:list",
        "omnifocus:projects:get"
      ],
      "create": [
        "omnifocus:projects:create"
      ],
      "write": [
        "omnifocus:projects:update"
      ],
      "delete": [
        "omnifocus:projects:delete"
      ]
    },
    "tasks": {
      "read": [
        "omnifocus:tasks:list",
        "omnifocus:tasks:get"
      ],
      "create": [
        "omnifocus:tasks:create"
      ],
      "write": [
        "omnifocus:tasks:update"
      ],
      "delete": [
        "omnifocus:tasks:delete"
      ]
    },
    "tags": {
      "read": [
        "omnifocus:tags:list",
        "omnifocus:tags:get"
      ],
      "create": [
        "omnifocus:tags:create"
      ],
      "write": [
        "omnifocus:tags:update"
      ],
      "delete": [
        "omnifocus:tags:delete"
      ]
    },
    "inboxTasks": {
      "read": [
        "omnifocus:inboxTasks:list",
        "omnifocus:inboxTasks:get"
      ],
      "create": [
        "omnifocus:inboxTasks:create"
      ],
      "write": [
        "omnifocus:inboxTasks:update"
      ],
      "delete": [
        "omnifocus:inboxTasks:delete"
      ]
    },
    "perspectives": {
      "read": [
        "omnifocus:perspectives:list",
        "omnifocus:perspectives:get"
      ]
    },
    "app": {
      "read": [
        "omnifocus:app:complete",
        "omnifocus:app:markComplete",
        "omnifocus:app:markIncomplete",
        "omnifocus:app:markDropped",
        "omnifocus:app:parseTasksInto",
        "omnifocus:app:archive",
        "omnifocus:app:compact",
        "omnifocus:app:synchronize",
        "omnifocus:app:importInto",
        "omnifocus:app:undo",
        "omnifocus:app:redo"
      ]
    }
  },
  "extraction": {
    "sourceFile": "omnifocus.sdef",
    "confidence": {
      "overall": 0.95,
      "fields": {
        "resources": 1,
        "enums": 1,
        "hierarchy": 0.95,
        "commands": 0.95
      }
    },
    "openQuestions": [
      {
        "question": "Should we include flattened accessor classes (flattened task, flattened project, etc.)?",
        "context": "These are documented in the SDEF but are primarily for convenience access",
        "relatedTo": "Task, Project, Folder, Tag"
      }
    ]
  }
} as AppManifest,
} as const;
