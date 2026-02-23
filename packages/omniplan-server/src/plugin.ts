/**
 * API plugin for OmniPlan.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for OmniPlan.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for OmniPlan.app automation.
 */
export const omniPlanApiPlugin = {
  name: 'omniplan',
  bundleId: 'com.omnigroup.OmniPlan3.MacAppStore',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.omnigroup.OmniPlan3.MacAppStore",
    "name": "OmniPlan",
    "displayName": "OmniPlan",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "app-store"
  },
  "suites": [
    {
      "name": "Standard Suite",
      "description": "Common classes and commands for all applications",
      "code": "core",
      "resources": [],
      "commands": [],
      "enums": []
    },
    {
      "name": "OmniPlan suite",
      "description": "AppleScript commands and classes specific to OmniPlan",
      "code": "OPLN",
      "resources": [
        "Project",
        "Task",
        "Milestone",
        "Resource",
        "Assignment",
        "Dependency",
        "Violation",
        "Scenario",
        "Schedule",
        "Currency"
      ],
      "commands": [
        "export",
        "assign",
        "depend",
        "baseline",
        "level",
        "lookup",
        "changeMark",
        "addWorkTime",
        "subtractWorkTime",
        "fix",
        "undo",
        "redo"
      ],
      "enums": [
        "TaskType",
        "TaskStatus",
        "ResourceType",
        "DependencyType",
        "SchedulingGranularity"
      ]
    }
  ],
  "resources": {
    "Project": {
      "name": "Project",
      "plural": "Projects",
      "description": "An OmniPlan project",
      "code": "OPpj",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier for the project",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "r",
          "type": "string",
          "description": "The project's name",
          "code": "pnam",
          "optional": false
        },
        "startingDate": {
          "access": "rw",
          "type": "date",
          "description": "The date on which work can begin",
          "code": "Opsd",
          "optional": false
        },
        "endingDate": {
          "access": "r",
          "type": "date",
          "description": "The date on which work is complete",
          "code": "Oped",
          "optional": false
        },
        "totalCost": {
          "access": "r",
          "type": "number",
          "description": "The cost of the entire project",
          "code": "OPtc",
          "optional": false
        },
        "completed": {
          "access": "r",
          "type": "number",
          "description": "The percentage of the project which is complete (1.0 = 100%)",
          "code": "OPco",
          "optional": false
        },
        "duration": {
          "access": "r",
          "type": "number",
          "description": "The total duration of the project in seconds",
          "code": "Otdu",
          "optional": false
        },
        "effort": {
          "access": "r",
          "type": "number",
          "description": "The number of person-seconds required to complete the project",
          "code": "Otef",
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
    "Task": {
      "name": "Task",
      "plural": "Tasks",
      "description": "A task within an OmniPlan project",
      "code": "Optk",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Internal identifier for this task",
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
        "startingDate": {
          "access": "rw",
          "type": "date",
          "description": "The date on which work begins",
          "code": "Opsd",
          "optional": false
        },
        "endingDate": {
          "access": "rw",
          "type": "date",
          "description": "The date on which work ends",
          "code": "Oped",
          "optional": false
        },
        "duration": {
          "access": "rw",
          "type": "number",
          "description": "The number of working seconds occupied by task",
          "code": "Otdu",
          "optional": false
        },
        "effort": {
          "access": "rw",
          "type": "number",
          "description": "The number of person-seconds required to perform the task",
          "code": "Otef",
          "optional": false
        },
        "completed": {
          "access": "rw",
          "type": "number",
          "description": "The percentage of the task which is complete (1.0 = 100%)",
          "code": "OPco",
          "optional": false
        },
        "completedEffort": {
          "access": "rw",
          "type": "number",
          "description": "The person-seconds completed",
          "code": "Otce",
          "optional": false
        },
        "remainingEffort": {
          "access": "r",
          "type": "number",
          "description": "The person-seconds remaining",
          "code": "Oter",
          "optional": false
        },
        "priority": {
          "access": "rw",
          "type": "integer",
          "description": "Priority of this task",
          "code": "Otpr",
          "optional": false
        },
        "taskStatus": {
          "access": "r",
          "type": {
            "enum": "TaskStatus"
          },
          "description": "The status of the current task",
          "code": "OPTs",
          "optional": false
        },
        "taskType": {
          "access": "rw",
          "type": {
            "enum": "TaskType"
          },
          "description": "Whether this task is a standard task, milestone, group, or hammock",
          "code": "OPTT",
          "optional": false
        },
        "staticCost": {
          "access": "rw",
          "type": "number",
          "description": "Cost for this task itself",
          "code": "OPSC",
          "optional": false
        },
        "resourceCost": {
          "access": "r",
          "type": "number",
          "description": "Cost for paying resources assigned to this task",
          "code": "OPrc",
          "optional": false
        },
        "totalCost": {
          "access": "r",
          "type": "number",
          "description": "Total cost for this task",
          "code": "OPtc",
          "optional": false
        },
        "outlineDepth": {
          "access": "r",
          "type": "integer",
          "description": "The depth or level of this task in the project hierarchy",
          "code": "Odep",
          "optional": false
        },
        "outlineNumber": {
          "access": "r",
          "type": "string",
          "description": "The hierarchical or WBS number of this task",
          "code": "Onum",
          "optional": false
        },
        "startingConstraintDate": {
          "access": "rw",
          "type": "date",
          "description": "The earliest date this task may start",
          "code": "Otsa",
          "optional": false
        },
        "endingConstraintDate": {
          "access": "rw",
          "type": "date",
          "description": "The latest date this task may end",
          "code": "Otfb",
          "optional": false
        },
        "startingDateLocked": {
          "access": "rw",
          "type": "boolean",
          "description": "Whether the start date is locked or not",
          "code": "Otsl",
          "optional": false
        },
        "endingDateLocked": {
          "access": "rw",
          "type": "boolean",
          "description": "Whether the end date is locked or not",
          "code": "Otel",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "Notes",
          "code": "Opnt",
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
    "Milestone": {
      "name": "Milestone",
      "plural": "Milestones",
      "description": "A milestone (zero-duration marker task)",
      "code": "Opms",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Internal identifier for this milestone",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the milestone",
          "code": "pnam",
          "optional": false
        },
        "startingDate": {
          "access": "rw",
          "type": "date",
          "description": "The date of the milestone",
          "code": "Opsd",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "Notes",
          "code": "Opnt",
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
    "Resource": {
      "name": "Resource",
      "plural": "Resources",
      "description": "A resource (person, equipment, or material)",
      "code": "Oprs",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "Internal identifier for this resource",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the resource",
          "code": "pnam",
          "optional": false
        },
        "resourceType": {
          "access": "rw",
          "type": {
            "enum": "ResourceType"
          },
          "description": "Type of the resource",
          "code": "Orty",
          "optional": false
        },
        "number": {
          "access": "rw",
          "type": "number",
          "description": "The total number of units for this resource (1.0 = 100%)",
          "code": "Orna",
          "optional": false
        },
        "emailAddress": {
          "access": "rw",
          "type": "string",
          "description": "Email address for this resource",
          "code": "Orem",
          "optional": false
        },
        "costPerUse": {
          "access": "rw",
          "type": "number",
          "description": "The fixed cost per use of this resource",
          "code": "OPCu",
          "optional": false
        },
        "costPerHour": {
          "access": "rw",
          "type": "number",
          "description": "The cost per hour of this resource",
          "code": "OPCh",
          "optional": false
        },
        "efficiency": {
          "access": "rw",
          "type": "number",
          "description": "Resource efficiency (1.0 = 100%)",
          "code": "OPef",
          "optional": false
        },
        "totalUses": {
          "access": "r",
          "type": "integer",
          "description": "Total number of uses of this resource",
          "code": "OPtu",
          "optional": false
        },
        "totalSeconds": {
          "access": "r",
          "type": "number",
          "description": "Total seconds worked by this resource",
          "code": "OPth",
          "optional": false
        },
        "totalCost": {
          "access": "r",
          "type": "number",
          "description": "Total cost of all assignments for this resource",
          "code": "OPtc",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "Notes",
          "code": "Opnt",
          "optional": false
        },
        "outlineDepth": {
          "access": "r",
          "type": "integer",
          "description": "The depth or level of this resource in the hierarchy",
          "code": "Odep",
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
    "Assignment": {
      "name": "Assignment",
      "plural": "Assignments",
      "description": "An assignment of a resource to a task",
      "code": "Opas",
      "properties": {
        "units": {
          "access": "rw",
          "type": "number",
          "description": "Units of the resource required for this task (1.0 = 100%)",
          "code": "Oaan",
          "optional": false
        }
      }
    },
    "Dependency": {
      "name": "Dependency",
      "plural": "Dependencies",
      "description": "A dependency of one task upon another task",
      "code": "Opdp",
      "properties": {
        "dependencyType": {
          "access": "rw",
          "type": {
            "enum": "DependencyType"
          },
          "description": "Type of dependency",
          "code": "OPdk",
          "optional": false
        },
        "leadTime": {
          "access": "rw",
          "type": "number",
          "description": "The number of seconds of lead time required between the tasks",
          "code": "OPlt",
          "optional": false
        },
        "leadPercentage": {
          "access": "rw",
          "type": "number",
          "description": "The lead time, in percentage of the length of the prerequisite",
          "code": "OPlp",
          "optional": false
        }
      }
    },
    "Violation": {
      "name": "Violation",
      "plural": "Violations",
      "description": "A scheduling conflict or issue",
      "code": "Opis",
      "properties": {
        "violationType": {
          "access": "r",
          "type": "string",
          "description": "The type of violation",
          "code": "OPty",
          "optional": false
        },
        "shortDescription": {
          "access": "r",
          "type": "string",
          "description": "The short description of this violation",
          "code": "OPde",
          "optional": false
        },
        "html": {
          "access": "r",
          "type": "string",
          "description": "The long description HTML for this violation",
          "code": "OPht",
          "optional": false
        }
      }
    },
    "Scenario": {
      "name": "Scenario",
      "plural": "Scenarios",
      "description": "An alternative project plan",
      "code": "OPso",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier for the scenario",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of the scenario",
          "code": "pnam",
          "optional": false
        },
        "startingDate": {
          "access": "rw",
          "type": "date",
          "description": "The date on which work can begin",
          "code": "Opsd",
          "optional": false
        },
        "endingDate": {
          "access": "r",
          "type": "date",
          "description": "The date on which work is complete",
          "code": "Oped",
          "optional": false
        },
        "totalCost": {
          "access": "r",
          "type": "number",
          "description": "The cost of the entire project",
          "code": "OPtc",
          "optional": false
        },
        "completed": {
          "access": "r",
          "type": "number",
          "description": "The percentage complete (1.0 = 100%)",
          "code": "OPco",
          "optional": false
        },
        "duration": {
          "access": "r",
          "type": "number",
          "description": "The total duration in seconds",
          "code": "Otdu",
          "optional": false
        },
        "effort": {
          "access": "r",
          "type": "number",
          "description": "The number of person-seconds required",
          "code": "Otef",
          "optional": false
        },
        "violationCount": {
          "access": "r",
          "type": "integer",
          "description": "Number of violations in the scenario",
          "code": "Opec",
          "optional": false
        },
        "schedulingGranularity": {
          "access": "rw",
          "type": {
            "enum": "SchedulingGranularity"
          },
          "description": "Scheduling granularity for this scenario",
          "code": "Opsg",
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
    "Schedule": {
      "name": "Schedule",
      "plural": "Schedules",
      "description": "A schedule of working time",
      "code": "OPsc",
      "properties": {}
    },
    "Currency": {
      "name": "Currency",
      "plural": "Currencies",
      "description": "A locale based currency object",
      "code": "OPcu",
      "properties": {
        "code": {
          "access": "r",
          "type": "string",
          "description": "Locale code for this currency",
          "code": "OPcc",
          "optional": false
        },
        "name": {
          "access": "r",
          "type": "string",
          "description": "Name for this currency",
          "code": "pnam",
          "optional": false
        },
        "symbol": {
          "access": "r",
          "type": "string",
          "description": "Symbol for this currency",
          "code": "OPcs",
          "optional": false
        }
      }
    }
  },
  "enums": {
    "TaskType": {
      "name": "TaskType",
      "description": "Type of task",
      "code": "OPTT",
      "values": [
        {
          "name": "standardTask",
          "value": "standardTask",
          "description": "A standard task",
          "code": "OPTS"
        },
        {
          "name": "milestoneTask",
          "value": "milestoneTask",
          "description": "A milestone",
          "code": "OPTM"
        },
        {
          "name": "groupTask",
          "value": "groupTask",
          "description": "A task which contains other tasks",
          "code": "OPTG"
        },
        {
          "name": "hammockTask",
          "value": "hammockTask",
          "description": "A task whose length is defined by its dependencies",
          "code": "OPTH"
        }
      ]
    },
    "TaskStatus": {
      "name": "TaskStatus",
      "description": "Status of a task",
      "code": "OPTs",
      "values": [
        {
          "name": "ok",
          "value": "ok",
          "description": "None of the other statuses is true",
          "code": "OPTo"
        },
        {
          "name": "closeToDueDate",
          "value": "closeToDueDate",
          "description": "Task is close to due date",
          "code": "OPTc"
        },
        {
          "name": "dueNow",
          "value": "dueNow",
          "description": "Task is due today",
          "code": "OPTd"
        },
        {
          "name": "pastDue",
          "value": "pastDue",
          "description": "Task is past due",
          "code": "OPTp"
        },
        {
          "name": "finished",
          "value": "finished",
          "description": "Task is complete",
          "code": "OPTm"
        }
      ]
    },
    "ResourceType": {
      "name": "ResourceType",
      "description": "Type of resource",
      "code": "OPRT",
      "values": [
        {
          "name": "person",
          "value": "person",
          "description": "Resource person designation",
          "code": "OPRs"
        },
        {
          "name": "equipment",
          "value": "equipment",
          "description": "Resource equipment designation",
          "code": "OPRe"
        },
        {
          "name": "material",
          "value": "material",
          "description": "Resource material designation",
          "code": "OPRm"
        },
        {
          "name": "resourceGroup",
          "value": "resourceGroup",
          "description": "Resource group designation",
          "code": "OPRg"
        }
      ]
    },
    "DependencyType": {
      "name": "DependencyType",
      "description": "Type of dependency between tasks",
      "code": "OPdk",
      "values": [
        {
          "name": "startstart",
          "value": "startstart",
          "description": "Start to start",
          "code": "ODss"
        },
        {
          "name": "startfinish",
          "value": "startfinish",
          "description": "Start to finish",
          "code": "ODsf"
        },
        {
          "name": "finishstart",
          "value": "finishstart",
          "description": "Finish to start",
          "code": "ODfs"
        },
        {
          "name": "finishfinish",
          "value": "finishfinish",
          "description": "Finish to finish",
          "code": "ODff"
        }
      ]
    },
    "SchedulingGranularity": {
      "name": "SchedulingGranularity",
      "description": "Granularity for task scheduling",
      "code": "OPSG",
      "values": [
        {
          "name": "exactScheduling",
          "value": "exactScheduling",
          "description": "Schedule tasks exactly down to the second",
          "code": "OPS0"
        },
        {
          "name": "hourlyScheduling",
          "value": "hourlyScheduling",
          "description": "All tasks start and end on hour boundaries",
          "code": "OPS1"
        },
        {
          "name": "dailyScheduling",
          "value": "dailyScheduling",
          "description": "All tasks start at the beginning of a day and end at the end of a day",
          "code": "OPS2"
        }
      ]
    }
  },
  "hierarchy": {
    "children": {
      "projects": {
        "resource": "Project",
        "access": "r",
        "description": "Projects in the document",
        "children": {
          "scenarios": {
            "resource": "Scenario",
            "access": "r",
            "description": "Scenarios within a project",
            "children": {
              "tasks": {
                "resource": "Task",
                "access": "rw",
                "description": "Tasks within a scenario",
                "children": {
                  "tasks": {
                    "resource": "Task",
                    "access": "rw",
                    "description": "Subtasks within a task"
                  }
                }
              },
              "milestones": {
                "resource": "Milestone",
                "access": "rw",
                "description": "Milestones within a scenario"
              },
              "resources": {
                "resource": "Resource",
                "access": "rw",
                "description": "Resources within a scenario"
              },
              "violations": {
                "resource": "Violation",
                "access": "r",
                "description": "Violations within a scenario"
              }
            }
          },
          "tasks": {
            "resource": "Task",
            "access": "rw",
            "description": "Tasks within a project",
            "children": {
              "tasks": {
                "resource": "Task",
                "access": "rw",
                "description": "Subtasks within a task"
              },
              "assignments": {
                "resource": "Assignment",
                "access": "r",
                "description": "Resource assignments for a task"
              },
              "dependencies": {
                "resource": "Dependency",
                "access": "r",
                "description": "Dependencies for a task"
              }
            }
          },
          "resources": {
            "resource": "Resource",
            "access": "rw",
            "description": "Resources within a project",
            "children": {
              "assignments": {
                "resource": "Assignment",
                "access": "r",
                "description": "Assignments for this resource"
              }
            }
          }
        }
      }
    }
  },
  "relationships": [],
  "commands": {
    "listProjects": {
      "name": "list",
      "description": "List all projects",
      "scope": "resource",
      "resourceType": "Project",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:projects:list"
    },
    "getProject": {
      "name": "get",
      "description": "Get a project",
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
      "permission": "omniplan:projects:get"
    },
    "listTasks": {
      "name": "list",
      "description": "List all tasks",
      "scope": "resource",
      "resourceType": "Task",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:tasks:list"
    },
    "getTask": {
      "name": "get",
      "description": "Get a task by ID",
      "scope": "resource",
      "resourceType": "Task",
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "description": "Task identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omniplan:tasks:get"
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
          "name": "startingDate",
          "type": "date",
          "description": "Start date",
          "required": false
        },
        {
          "name": "duration",
          "type": "number",
          "description": "Duration in seconds",
          "required": false
        }
      ],
      "code": "crel",
      "permission": "omniplan:tasks:create"
    },
    "listMilestones": {
      "name": "list",
      "description": "List all milestones",
      "scope": "resource",
      "resourceType": "Milestone",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:milestones:list"
    },
    "getMilestone": {
      "name": "get",
      "description": "Get a milestone by ID",
      "scope": "resource",
      "resourceType": "Milestone",
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "description": "Milestone identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omniplan:milestones:get"
    },
    "createMilestone": {
      "name": "create",
      "description": "Create a new milestone",
      "scope": "resource",
      "resourceType": "Milestone",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Milestone name",
          "required": true
        },
        {
          "name": "startingDate",
          "type": "date",
          "description": "Milestone date",
          "required": false
        }
      ],
      "code": "crel",
      "permission": "omniplan:milestones:create"
    },
    "listResources": {
      "name": "list",
      "description": "List all resources",
      "scope": "resource",
      "resourceType": "Resource",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:resources:list"
    },
    "getResource": {
      "name": "get",
      "description": "Get a resource by ID",
      "scope": "resource",
      "resourceType": "Resource",
      "parameters": [
        {
          "name": "id",
          "type": "integer",
          "description": "Resource identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omniplan:resources:get"
    },
    "createResource": {
      "name": "create",
      "description": "Create a new resource",
      "scope": "resource",
      "resourceType": "Resource",
      "parameters": [
        {
          "name": "name",
          "type": "string",
          "description": "Resource name",
          "required": true
        },
        {
          "name": "resourceType",
          "type": "ResourceType",
          "description": "Resource type",
          "required": false
        }
      ],
      "code": "crel",
      "permission": "omniplan:resources:create"
    },
    "listAssignments": {
      "name": "list",
      "description": "List all assignments",
      "scope": "resource",
      "resourceType": "Assignment",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:assignments:list"
    },
    "listDependencies": {
      "name": "list",
      "description": "List all dependencies",
      "scope": "resource",
      "resourceType": "Dependency",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:dependencies:list"
    },
    "listViolations": {
      "name": "list",
      "description": "List all violations",
      "scope": "resource",
      "resourceType": "Violation",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:violations:list"
    },
    "listScenarios": {
      "name": "list",
      "description": "List all scenarios",
      "scope": "resource",
      "resourceType": "Scenario",
      "parameters": [],
      "code": "core",
      "permission": "omniplan:scenarios:list"
    },
    "getScenario": {
      "name": "get",
      "description": "Get a scenario by ID",
      "scope": "resource",
      "resourceType": "Scenario",
      "parameters": [
        {
          "name": "id",
          "type": "string",
          "description": "Scenario identifier",
          "required": true
        }
      ],
      "code": "getd",
      "permission": "omniplan:scenarios:get"
    },
    "export": {
      "name": "export",
      "description": "Export a document",
      "scope": "application",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "Export file path",
          "required": true
        }
      ],
      "code": "xprt",
      "permission": "omniplan:app:export"
    },
    "assign": {
      "name": "assign",
      "description": "Assign resources to tasks",
      "scope": "application",
      "parameters": [
        {
          "name": "resource",
          "type": "string",
          "description": "Resource to assign",
          "required": true
        },
        {
          "name": "task",
          "type": "string",
          "description": "Task to assign to",
          "required": true
        }
      ],
      "code": "ASSN",
      "permission": "omniplan:app:assign"
    },
    "depend": {
      "name": "depend",
      "description": "Create a dependency between tasks",
      "scope": "application",
      "parameters": [
        {
          "name": "prerequisite",
          "type": "string",
          "description": "Prerequisite task",
          "required": true
        },
        {
          "name": "dependent",
          "type": "string",
          "description": "Dependent task",
          "required": true
        }
      ],
      "code": "SCHD",
      "permission": "omniplan:app:depend"
    },
    "baseline": {
      "name": "baseline",
      "description": "Commit the current schedule as the baseline schedule",
      "scope": "application",
      "parameters": [],
      "code": "BASE",
      "permission": "omniplan:app:baseline"
    },
    "level": {
      "name": "level",
      "description": "Level resources on project",
      "scope": "application",
      "parameters": [],
      "code": "LEVL",
      "permission": "omniplan:app:level"
    },
    "lookup": {
      "name": "lookup",
      "description": "Look up a task via a custom data key",
      "scope": "application",
      "parameters": [
        {
          "name": "key",
          "type": "string",
          "description": "Custom data key",
          "required": true
        }
      ],
      "code": "LOOK",
      "permission": "omniplan:app:lookup"
    },
    "changeMark": {
      "name": "changeMark",
      "description": "Make a change tracking mark on project",
      "scope": "application",
      "parameters": [],
      "code": "MARK",
      "permission": "omniplan:app:changeMark"
    },
    "addWorkTime": {
      "name": "addWorkTime",
      "description": "Add working hours to a schedule",
      "scope": "application",
      "parameters": [
        {
          "name": "schedule",
          "type": "string",
          "description": "Target schedule",
          "required": true
        }
      ],
      "code": "ADDS",
      "permission": "omniplan:app:addWorkTime"
    },
    "subtractWorkTime": {
      "name": "subtractWorkTime",
      "description": "Remove working hours from a schedule",
      "scope": "application",
      "parameters": [
        {
          "name": "schedule",
          "type": "string",
          "description": "Target schedule",
          "required": true
        }
      ],
      "code": "SUBS",
      "permission": "omniplan:app:subtractWorkTime"
    },
    "fix": {
      "name": "fix",
      "description": "Fix a violation",
      "scope": "resource",
      "resourceType": "Violation",
      "parameters": [],
      "code": "FIX ",
      "permission": "omniplan:violations:fix"
    },
    "undo": {
      "name": "undo",
      "description": "Undo the last command",
      "scope": "application",
      "parameters": [],
      "code": "UNDO",
      "permission": "omniplan:app:undo"
    },
    "redo": {
      "name": "redo",
      "description": "Redo the last undone command",
      "scope": "application",
      "parameters": [],
      "code": "REDO",
      "permission": "omniplan:app:redo"
    }
  },
  "permissions": {
    "projects": {
      "read": [
        "omniplan:projects:list",
        "omniplan:projects:get"
      ]
    },
    "tasks": {
      "read": [
        "omniplan:tasks:list",
        "omniplan:tasks:get"
      ],
      "create": [
        "omniplan:tasks:create"
      ],
      "write": [
        "omniplan:tasks:update"
      ],
      "delete": [
        "omniplan:tasks:delete"
      ]
    },
    "milestones": {
      "read": [
        "omniplan:milestones:list",
        "omniplan:milestones:get"
      ],
      "create": [
        "omniplan:milestones:create"
      ],
      "write": [
        "omniplan:milestones:update"
      ],
      "delete": [
        "omniplan:milestones:delete"
      ]
    },
    "resources": {
      "read": [
        "omniplan:resources:list",
        "omniplan:resources:get"
      ],
      "create": [
        "omniplan:resources:create"
      ],
      "write": [
        "omniplan:resources:update"
      ],
      "delete": [
        "omniplan:resources:delete"
      ]
    },
    "assignments": {
      "read": [
        "omniplan:assignments:list"
      ]
    },
    "dependencies": {
      "read": [
        "omniplan:dependencies:list"
      ]
    },
    "violations": {
      "read": [
        "omniplan:violations:list"
      ],
      "write": [
        "omniplan:violations:fix"
      ]
    },
    "scenarios": {
      "read": [
        "omniplan:scenarios:list",
        "omniplan:scenarios:get"
      ]
    },
    "app": {
      "read": [
        "omniplan:app:export",
        "omniplan:app:assign",
        "omniplan:app:depend",
        "omniplan:app:baseline",
        "omniplan:app:level",
        "omniplan:app:lookup",
        "omniplan:app:changeMark",
        "omniplan:app:addWorkTime",
        "omniplan:app:subtractWorkTime",
        "omniplan:app:undo",
        "omniplan:app:redo"
      ]
    }
  },
  "extraction": {
    "sourceFile": "omniplan.sdef",
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
        "question": "Should we include the style and custom data classes?",
        "context": "These are documented in the SDEF but are more advanced features",
        "relatedTo": "Task, Resource"
      }
    ]
  }
} as AppManifest,
} as const;
