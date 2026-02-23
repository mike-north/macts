/**
 * API plugin for Messages.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Messages.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Messages.app automation.
 */
export const messagesApiPlugin = {
  name: 'messages',
  bundleId: 'com.apple.MobileSMS',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.MobileSMS",
    "name": "Messages",
    "displayName": "Messages",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Messages Suite",
      "description": "commands and classes for Messages scripting.",
      "code": "icht",
      "resources": [
        "Participant",
        "Account",
        "Chat"
      ],
      "commands": [
        "send",
        "login",
        "logout"
      ],
      "enums": [
        "ServiceType",
        "Direction",
        "TransferStatus",
        "ConnectionStatus"
      ]
    }
  ],
  "resources": {
    "Participant": {
      "name": "Participant",
      "plural": "Participants",
      "description": "A participant for an account.",
      "code": "pres",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The participant's unique identifier. For example: 01234567-89AB-CDEF-0123-456789ABCDEF:+11234567890",
          "code": "ID  ",
          "optional": false
        },
        "account": {
          "access": "r",
          "type": {
            "resource": "account"
          },
          "description": "The account for this participant.",
          "code": "icsv",
          "optional": false
        },
        "name": {
          "access": "r",
          "type": "string",
          "description": "The participant's name as it appears in the participant list.",
          "code": "pnam",
          "optional": false
        },
        "handle": {
          "access": "r",
          "type": "string",
          "description": "The participant's handle.",
          "code": "hndl",
          "optional": false
        },
        "firstName": {
          "access": "r",
          "type": "string",
          "description": "The first name from this participan's Contacts card, if available",
          "code": "prfn",
          "optional": false
        },
        "lastName": {
          "access": "r",
          "type": "string",
          "description": "The last name from this participant's Contacts card, if available",
          "code": "prLn",
          "optional": false
        },
        "fullName": {
          "access": "r",
          "type": "string",
          "description": "The full name from this participant's Contacts card, if available",
          "code": "prFn",
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
    "Account": {
      "name": "Account",
      "plural": "Accounts",
      "description": "An account that can be logged in to from this system",
      "code": "icsv",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "A unique identifier for this account.",
          "code": "ID  ",
          "optional": false
        },
        "description": {
          "access": "r",
          "type": "string",
          "description": "The name of this account as defined in Account preferences description field",
          "code": "msdn",
          "optional": false
        },
        "enabled": {
          "access": "rw",
          "type": "boolean",
          "description": "Is the account enabled?",
          "code": "enbl",
          "optional": false
        },
        "connectionStatus": {
          "access": "r",
          "type": "string",
          "description": "The connection status for this account.",
          "code": "ssta",
          "optional": false
        },
        "serviceType": {
          "access": "r",
          "type": "string",
          "description": "The type of service for this account",
          "code": "styp",
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
    "Chat": {
      "name": "Chat",
      "plural": "Chats",
      "description": "An SMS or iMessage chat.",
      "code": "imct",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "A guid identifier for this chat.",
          "code": "ID  ",
          "optional": false
        },
        "name": {
          "access": "r",
          "type": "string",
          "description": "The chat's name as it appears in the chat list.",
          "code": "pnam",
          "optional": false
        },
        "account": {
          "access": "r",
          "type": {
            "resource": "account"
          },
          "description": "The account which is participating in this chat.",
          "code": "icsv",
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
    "ServiceType": {
      "name": "ServiceType",
      "code": "styp",
      "values": [
        {
          "name": "sMS",
          "value": "sMS",
          "code": "ssms"
        },
        {
          "name": "iMessage",
          "value": "iMessage",
          "code": "sims"
        },
        {
          "name": "rCS",
          "value": "rCS",
          "code": "srcs"
        }
      ]
    },
    "Direction": {
      "name": "Direction",
      "code": "FTdr",
      "values": [
        {
          "name": "incoming",
          "value": "incoming",
          "code": "FTic"
        },
        {
          "name": "outgoing",
          "value": "outgoing",
          "code": "FTog"
        }
      ]
    },
    "TransferStatus": {
      "name": "TransferStatus",
      "code": "FTst",
      "values": [
        {
          "name": "preparing",
          "value": "preparing",
          "code": "FTsp"
        },
        {
          "name": "waiting",
          "value": "waiting",
          "code": "FTsw"
        },
        {
          "name": "transferring",
          "value": "transferring",
          "code": "FTsg"
        },
        {
          "name": "finalizing",
          "value": "finalizing",
          "code": "FTsz"
        },
        {
          "name": "finished",
          "value": "finished",
          "code": "FTsf"
        },
        {
          "name": "failed",
          "value": "failed",
          "code": "FTse"
        }
      ]
    },
    "ConnectionStatus": {
      "name": "ConnectionStatus",
      "code": "ssta",
      "values": [
        {
          "name": "disconnecting",
          "value": "disconnecting",
          "code": "dcng"
        },
        {
          "name": "connected",
          "value": "connected",
          "code": "conn"
        },
        {
          "name": "connecting",
          "value": "connecting",
          "code": "cong"
        },
        {
          "name": "disconnected",
          "value": "disconnected",
          "code": "dcon"
        }
      ]
    }
  },
  "hierarchy": {
    "children": {
      "participants": {
        "resource": "Participant",
        "access": "r",
        "description": "A participant for an account."
      },
      "accounts": {
        "resource": "Account",
        "access": "r",
        "description": "An account that can be logged in to from this system",
        "children": {
          "chats": {
            "resource": "Chat",
            "access": "r",
            "description": "An SMS or iMessage chat.",
            "children": {
              "participants": {
                "resource": "Participant",
                "access": "r",
                "description": "A participant for an account."
              }
            }
          },
          "participants": {
            "resource": "Participant",
            "access": "r",
            "description": "A participant for an account."
          }
        }
      },
      "chats": {
        "resource": "Chat",
        "access": "r",
        "description": "An SMS or iMessage chat.",
        "children": {
          "participants": {
            "resource": "Participant",
            "access": "r",
            "description": "A participant for an account."
          }
        }
      }
    }
  },
  "relationships": [],
  "commands": {
    "send": {
      "name": "send",
      "description": "Sends a message to a participant or to a chat.",
      "scope": "application",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "The to parameter",
          "required": true,
          "code": "TO  "
        }
      ],
      "code": "send"
    },
    "login": {
      "name": "login",
      "description": "Login to all accounts.",
      "scope": "application",
      "parameters": [],
      "code": "logi"
    },
    "logout": {
      "name": "logout",
      "description": "Logout of all accounts.",
      "scope": "application",
      "parameters": [],
      "code": "logo"
    }
  }
} as AppManifest,
} as const;
