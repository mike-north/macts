/**
 * API plugin for Mail.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Mail.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Mail.app automation.
 */
export const mailApiPlugin = {
  name: 'mail',
  bundleId: 'com.apple.mail',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.mail",
    "name": "Mail",
    "displayName": "Mail",
    "tccEntitlements": [
      "automation"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Standard Suite",
      "description": "Common classes and commands for all applications.",
      "code": "????",
      "resources": [],
      "commands": [
        "delete",
        "duplicate",
        "move"
      ],
      "enums": []
    },
    {
      "name": "Text Suite",
      "description": "A set of basic classes for text processing.",
      "code": "????",
      "resources": [
        "RichText",
        "Attachment",
        "Paragraph",
        "Word",
        "Character",
        "AttributeRun"
      ],
      "commands": [],
      "enums": []
    },
    {
      "name": "Mail",
      "description": "Classes and commands for the Mail application",
      "code": "emal",
      "resources": [
        "OutgoingMessage",
        "MessageViewer"
      ],
      "commands": [
        "bounce",
        "checkForNewMail",
        "extractNameFrom",
        "extractAddressFrom",
        "forward",
        "getURL",
        "importMailMailbox",
        "mailto",
        "performMailActionWithMessages",
        "redirect",
        "reply",
        "send",
        "synchronize"
      ],
      "enums": [
        "SaveableFileFormat",
        "DefaultMessageFormat",
        "HeaderDetail",
        "LdapScope",
        "QuotingColor",
        "ViewerColumns"
      ]
    },
    {
      "name": "Mail Framework",
      "description": "Classes and commands for the Mail framework",
      "code": "emsg",
      "resources": [
        "Message",
        "Account",
        "Mailbox",
        "Rule",
        "RuleCondition",
        "Recipient",
        "BccRecipient",
        "CcRecipient",
        "ToRecipient",
        "Header",
        "MailAttachment"
      ],
      "commands": [],
      "enums": [
        "Authentication",
        "HighlightColors",
        "MessageCachingPolicy",
        "RuleQualifier",
        "RuleType",
        "TypeOfAccount"
      ]
    }
  ],
  "resources": {
    "RichText": {
      "name": "RichText",
      "plural": "RichText",
      "description": "Rich (styled) text",
      "code": "ctxt",
      "properties": {
        "color": {
          "access": "rw",
          "type": "rgb",
          "description": "The color of the first character.",
          "code": "colr",
          "optional": false
        },
        "font": {
          "access": "rw",
          "type": "string",
          "description": "The name of the font of the first character.",
          "code": "font",
          "optional": false
        },
        "size": {
          "access": "rw",
          "type": "number",
          "description": "The size in points of the first character.",
          "code": "ptsz",
          "optional": false
        }
      }
    },
    "Attachment": {
      "name": "Attachment",
      "plural": "Attachments",
      "description": "Represents an inline text attachment. This class is used mainly for make commands.",
      "code": "atts",
      "properties": {
        "fileName": {
          "access": "rw",
          "type": "file",
          "description": "The file for the attachment",
          "code": "atfn",
          "optional": false
        }
      }
    },
    "Paragraph": {
      "name": "Paragraph",
      "plural": "Paragraphs",
      "description": "This subdivides the text into paragraphs.",
      "code": "cpar",
      "properties": {
        "color": {
          "access": "rw",
          "type": "rgb",
          "description": "The color of the first character.",
          "code": "colr",
          "optional": false
        },
        "font": {
          "access": "rw",
          "type": "string",
          "description": "The name of the font of the first character.",
          "code": "font",
          "optional": false
        },
        "size": {
          "access": "rw",
          "type": "number",
          "description": "The size in points of the first character.",
          "code": "ptsz",
          "optional": false
        }
      }
    },
    "Word": {
      "name": "Word",
      "plural": "Words",
      "description": "This subdivides the text into words.",
      "code": "cwor",
      "properties": {
        "color": {
          "access": "rw",
          "type": "rgb",
          "description": "The color of the first character.",
          "code": "colr",
          "optional": false
        },
        "font": {
          "access": "rw",
          "type": "string",
          "description": "The name of the font of the first character.",
          "code": "font",
          "optional": false
        },
        "size": {
          "access": "rw",
          "type": "number",
          "description": "The size in points of the first character.",
          "code": "ptsz",
          "optional": false
        }
      }
    },
    "Character": {
      "name": "Character",
      "plural": "Characters",
      "description": "This subdivides the text into characters.",
      "code": "cha ",
      "properties": {
        "color": {
          "access": "rw",
          "type": "rgb",
          "description": "The color of the character.",
          "code": "colr",
          "optional": false
        },
        "font": {
          "access": "rw",
          "type": "string",
          "description": "The name of the font of the character.",
          "code": "font",
          "optional": false
        },
        "size": {
          "access": "rw",
          "type": "number",
          "description": "The size in points of the character.",
          "code": "ptsz",
          "optional": false
        }
      }
    },
    "AttributeRun": {
      "name": "AttributeRun",
      "plural": "AttributeRuns",
      "description": "This subdivides the text into chunks that all have the same attributes.",
      "code": "catr",
      "properties": {
        "color": {
          "access": "rw",
          "type": "rgb",
          "description": "The color of the first character.",
          "code": "colr",
          "optional": false
        },
        "font": {
          "access": "rw",
          "type": "string",
          "description": "The name of the font of the first character.",
          "code": "font",
          "optional": false
        },
        "size": {
          "access": "rw",
          "type": "number",
          "description": "The size in points of the first character.",
          "code": "ptsz",
          "optional": false
        }
      }
    },
    "OutgoingMessage": {
      "name": "OutgoingMessage",
      "plural": "OutgoingMessages",
      "description": "A new email message",
      "code": "bcke",
      "properties": {
        "sender": {
          "access": "rw",
          "type": "string",
          "description": "The sender of the message",
          "code": "sndr",
          "optional": false
        },
        "subject": {
          "access": "rw",
          "type": "string",
          "description": "The subject of the message",
          "code": "subj",
          "optional": false
        },
        "visible": {
          "access": "rw",
          "type": "boolean",
          "description": "Controls whether the message window is shown on the screen. The default is false",
          "code": "pvis",
          "optional": false
        },
        "messageSignature": {
          "access": "rw",
          "type": "string",
          "description": "The signature of the message",
          "code": "tnrg",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "integer",
          "description": "The unique identifier of the message",
          "code": "ID  ",
          "optional": false
        },
        "htmlContent": {
          "access": "rw",
          "type": "string",
          "description": "Does nothing at all (deprecated)",
          "code": "htda",
          "optional": false
        },
        "vcardPath": {
          "access": "rw",
          "type": "file",
          "description": "Does nothing at all (deprecated)",
          "code": "htvc",
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
    "MessageViewer": {
      "name": "MessageViewer",
      "plural": "MessageViewers",
      "description": "Represents the object responsible for managing a viewer window",
      "code": "mvwr",
      "properties": {
        "draftsMailbox": {
          "access": "r",
          "type": {
            "resource": "mailbox"
          },
          "description": "The top level Drafts mailbox",
          "code": "drmb",
          "optional": false
        },
        "inbox": {
          "access": "r",
          "type": {
            "resource": "mailbox"
          },
          "description": "The top level In mailbox",
          "code": "inmb",
          "optional": false
        },
        "junkMailbox": {
          "access": "r",
          "type": {
            "resource": "mailbox"
          },
          "description": "The top level Junk mailbox",
          "code": "jkmb",
          "optional": false
        },
        "outbox": {
          "access": "r",
          "type": {
            "resource": "mailbox"
          },
          "description": "The top level Out mailbox",
          "code": "oumb",
          "optional": false
        },
        "sentMailbox": {
          "access": "r",
          "type": {
            "resource": "mailbox"
          },
          "description": "The top level Sent mailbox",
          "code": "stmb",
          "optional": false
        },
        "trashMailbox": {
          "access": "r",
          "type": {
            "resource": "mailbox"
          },
          "description": "The top level Trash mailbox",
          "code": "trmb",
          "optional": false
        },
        "sortColumn": {
          "access": "rw",
          "type": "string",
          "description": "The column that is currently sorted in the viewer",
          "code": "mvsc",
          "optional": false
        },
        "sortedAscending": {
          "access": "rw",
          "type": "boolean",
          "description": "Whether the viewer is sorted ascending or not",
          "code": "mvsr",
          "optional": false
        },
        "mailboxListVisible": {
          "access": "rw",
          "type": "boolean",
          "description": "Controls whether the list of mailboxes is visible or not",
          "code": "mlsh",
          "optional": false
        },
        "previewPaneIsVisible": {
          "access": "rw",
          "type": "boolean",
          "description": "Controls whether the preview pane of the message viewer window is visible or not",
          "code": "mvpv",
          "optional": false
        },
        "visibleColumns": {
          "access": "rw",
          "type": "string",
          "description": "List of columns that are visible. The subject column and the message status column will always be visible",
          "code": "mvvc",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "integer",
          "description": "The unique identifier of the message viewer",
          "code": "ID  ",
          "optional": false
        },
        "visibleMessages": {
          "access": "rw",
          "type": "string",
          "description": "List of messages currently being displayed in the viewer",
          "code": "mvfm",
          "optional": false
        },
        "selectedMessages": {
          "access": "rw",
          "type": "string",
          "description": "List of messages currently selected",
          "code": "smgs",
          "optional": false
        },
        "selectedMailboxes": {
          "access": "rw",
          "type": "string",
          "description": "List of mailboxes currently selected in the list of mailboxes",
          "code": "msbx",
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
    "Message": {
      "name": "Message",
      "plural": "Messages",
      "description": "An email message",
      "code": "mssg",
      "properties": {
        "id": {
          "access": "r",
          "type": "integer",
          "description": "The unique identifier of the message.",
          "code": "ID  ",
          "optional": false
        },
        "allHeaders": {
          "access": "r",
          "type": "string",
          "description": "All the headers of the message",
          "code": "alhe",
          "optional": false
        },
        "backgroundColor": {
          "access": "rw",
          "type": "string",
          "description": "The background color of the message",
          "code": "mcol",
          "optional": false
        },
        "mailbox": {
          "access": "rw",
          "type": {
            "resource": "mailbox"
          },
          "description": "The mailbox in which this message is filed",
          "code": "mbxp",
          "optional": false
        },
        "content": {
          "access": "r",
          "type": {
            "resource": "rich text"
          },
          "description": "Contents of an email message",
          "code": "ctnt",
          "optional": false
        },
        "dateReceived": {
          "access": "r",
          "type": "date",
          "description": "The date a message was received",
          "code": "rdrc",
          "optional": false
        },
        "dateSent": {
          "access": "r",
          "type": "date",
          "description": "The date a message was sent",
          "code": "drcv",
          "optional": false
        },
        "deletedStatus": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the message is deleted or not",
          "code": "isdl",
          "optional": false
        },
        "flaggedStatus": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the message is flagged or not",
          "code": "isfl",
          "optional": false
        },
        "flagIndex": {
          "access": "rw",
          "type": "integer",
          "description": "The flag on the message, or -1 if the message is not flagged",
          "code": "fidx",
          "optional": false
        },
        "junkMailStatus": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the message has been marked junk or evaluated to be junk by the junk mail filter.",
          "code": "isjk",
          "optional": false
        },
        "readStatus": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the message is read or not",
          "code": "isrd",
          "optional": false
        },
        "messageId": {
          "access": "r",
          "type": "string",
          "description": "The unique message ID string",
          "code": "meid",
          "optional": false
        },
        "source": {
          "access": "r",
          "type": "string",
          "description": "Raw source of the message",
          "code": "raso",
          "optional": false
        },
        "replyTo": {
          "access": "r",
          "type": "string",
          "description": "The address that replies should be sent to",
          "code": "rpto",
          "optional": false
        },
        "messageSize": {
          "access": "r",
          "type": "integer",
          "description": "The size (in bytes) of a message",
          "code": "msze",
          "optional": false
        },
        "sender": {
          "access": "r",
          "type": "string",
          "description": "The sender of the message",
          "code": "sndr",
          "optional": false
        },
        "subject": {
          "access": "r",
          "type": "string",
          "description": "The subject of the message",
          "code": "subj",
          "optional": false
        },
        "wasForwarded": {
          "access": "r",
          "type": "boolean",
          "description": "Indicates whether the message was forwarded or not",
          "code": "isfw",
          "optional": false
        },
        "wasRedirected": {
          "access": "r",
          "type": "boolean",
          "description": "Indicates whether the message was redirected or not",
          "code": "isrc",
          "optional": false
        },
        "wasRepliedTo": {
          "access": "r",
          "type": "boolean",
          "description": "Indicates whether the message was replied to or not",
          "code": "isrp",
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
      "description": "A Mail account for receiving messages (POP/IMAP). To create a new receiving account, use the 'pop account', 'imap account', and 'iCloud account' objects",
      "code": "mact",
      "properties": {
        "deliveryAccount": {
          "access": "rw",
          "type": "string",
          "description": "The delivery account used when sending mail from this account",
          "code": "dact",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of an account",
          "code": "pnam",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the account",
          "code": "ID  ",
          "optional": false
        },
        "password": {
          "access": "rw",
          "type": "string",
          "description": "Password for this account. Can be set, but not read via scripting",
          "code": "macp",
          "optional": false
        },
        "authentication": {
          "access": "rw",
          "type": "string",
          "description": "Preferred authentication scheme for account",
          "code": "paus",
          "optional": false
        },
        "accountType": {
          "access": "r",
          "type": "string",
          "description": "The type of an account",
          "code": "atyp",
          "optional": false
        },
        "emailAddresses": {
          "access": "rw",
          "type": "string",
          "description": "The list of email addresses configured for an account",
          "code": "emad",
          "optional": false
        },
        "fullName": {
          "access": "rw",
          "type": "string",
          "description": "The users full name configured for an account",
          "code": "flln",
          "optional": false
        },
        "emptyJunkMessagesFrequency": {
          "access": "rw",
          "type": "integer",
          "description": "Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete)",
          "code": "ejmf",
          "optional": false
        },
        "emptySentMessagesFrequency": {
          "access": "rw",
          "type": "integer",
          "description": "Does nothing at all (deprecated)",
          "code": "esmf",
          "optional": false
        },
        "emptyTrashFrequency": {
          "access": "rw",
          "type": "integer",
          "description": "Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 = never delete)",
          "code": "etrf",
          "optional": false
        },
        "emptyJunkMessagesOnQuit": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the messages in the junk messages mailboxes will be deleted on quit",
          "code": "ejmo",
          "optional": false
        },
        "emptySentMessagesOnQuit": {
          "access": "rw",
          "type": "boolean",
          "description": "Does nothing at all (deprecated)",
          "code": "esmo",
          "optional": false
        },
        "emptyTrashOnQuit": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the messages in deleted messages mailboxes will be permanently deleted on quit",
          "code": "etoq",
          "optional": false
        },
        "enabled": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the account is enabled or not",
          "code": "isac",
          "optional": false
        },
        "userName": {
          "access": "rw",
          "type": "string",
          "description": "The user name used to connect to an account",
          "code": "unme",
          "optional": false
        },
        "accountDirectory": {
          "access": "r",
          "type": "file",
          "description": "The directory where the account stores things on disk",
          "code": "path",
          "optional": false
        },
        "port": {
          "access": "rw",
          "type": "integer",
          "description": "The port used to connect to an account",
          "code": "port",
          "optional": false
        },
        "serverName": {
          "access": "rw",
          "type": "string",
          "description": "The host name used to connect to an account",
          "code": "host",
          "optional": false
        },
        "includeWhenGettingNewMail": {
          "access": "rw",
          "type": "boolean",
          "description": "Does nothing at all (deprecated)",
          "code": "iwgm",
          "optional": false
        },
        "moveDeletedMessagesToTrash": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether messages that are deleted will be moved to the trash mailbox",
          "code": "smdm",
          "optional": false
        },
        "usesSsl": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether SSL is enabled for this receiving account",
          "code": "usss",
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
    "Mailbox": {
      "name": "Mailbox",
      "plural": "Mailboxes",
      "description": "A mailbox that holds messages",
      "code": "mbxp",
      "properties": {
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of a mailbox",
          "code": "pnam",
          "optional": false
        },
        "unreadCount": {
          "access": "r",
          "type": "integer",
          "description": "The number of unread messages in the mailbox",
          "code": "mbuc",
          "optional": false
        },
        "account": {
          "access": "r",
          "type": {
            "resource": "account"
          },
          "description": "The account property",
          "code": "mact",
          "optional": false
        },
        "container": {
          "access": "r",
          "type": {
            "resource": "mailbox"
          },
          "description": "The container property",
          "code": "mbxc",
          "optional": false
        }
      }
    },
    "Rule": {
      "name": "Rule",
      "plural": "Rules",
      "description": "Class for message rules",
      "code": "rule",
      "properties": {
        "colorMessage": {
          "access": "rw",
          "type": "string",
          "description": "If rule matches, apply this color",
          "code": "rcme",
          "optional": false
        },
        "deleteMessage": {
          "access": "rw",
          "type": "boolean",
          "description": "If rule matches, delete message",
          "code": "rdme",
          "optional": false
        },
        "forwardText": {
          "access": "rw",
          "type": "string",
          "description": "If rule matches, prepend this text to the forwarded message. Set to empty string to include no prepended text",
          "code": "rfte",
          "optional": false
        },
        "forwardMessage": {
          "access": "rw",
          "type": "string",
          "description": "If rule matches, forward message to this address, or multiple addresses, separated by commas. Set to empty string to disable this action",
          "code": "rfad",
          "optional": false
        },
        "markFlagged": {
          "access": "rw",
          "type": "boolean",
          "description": "If rule matches, mark message as flagged",
          "code": "rmfl",
          "optional": false
        },
        "markFlagIndex": {
          "access": "rw",
          "type": "integer",
          "description": "If rule matches, mark message with the specified flag. Set to -1 to disable this action",
          "code": "rfcl",
          "optional": false
        },
        "markRead": {
          "access": "rw",
          "type": "boolean",
          "description": "If rule matches, mark message as read",
          "code": "rmre",
          "optional": false
        },
        "playSound": {
          "access": "rw",
          "type": "string",
          "description": "If rule matches, play this sound (specify name of sound or path to sound)",
          "code": "rpso",
          "optional": false
        },
        "redirectMessage": {
          "access": "rw",
          "type": "string",
          "description": "If rule matches, redirect message to this address or multiple addresses, separate by commas. Set to empty string to disable this action",
          "code": "rrad",
          "optional": false
        },
        "replyText": {
          "access": "rw",
          "type": "string",
          "description": "If rule matches, reply to message and prepend with this text. Set to empty string to disable this action",
          "code": "rrte",
          "optional": false
        },
        "runScript": {
          "access": "rw",
          "type": "string",
          "description": "If rule matches, run this compiled AppleScript file. Set to empty string to disable this action",
          "code": "rras",
          "optional": false
        },
        "allConditionsMustBeMet": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether all conditions must be met for rule to execute",
          "code": "racm",
          "optional": false
        },
        "copyMessage": {
          "access": "rw",
          "type": {
            "resource": "mailbox"
          },
          "description": "If rule matches, copy to this mailbox",
          "code": "rcmb",
          "optional": false
        },
        "moveMessage": {
          "access": "rw",
          "type": {
            "resource": "mailbox"
          },
          "description": "If rule matches, move to this mailbox",
          "code": "rtme",
          "optional": false
        },
        "highlightTextUsingColor": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the color will be used to highlight the text or background of a message in the message list",
          "code": "htuc",
          "optional": false
        },
        "enabled": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the rule is enabled",
          "code": "isac",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "Name of rule",
          "code": "pnam",
          "optional": false
        },
        "shouldCopyMessage": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the rule has a copy action",
          "code": "rscm",
          "optional": false
        },
        "shouldMoveMessage": {
          "access": "rw",
          "type": "boolean",
          "description": "Indicates whether the rule has a move action",
          "code": "rstm",
          "optional": false
        },
        "stopEvaluatingRules": {
          "access": "rw",
          "type": "boolean",
          "description": "If rule matches, stop rule evaluation for this message",
          "code": "rser",
          "optional": false
        }
      }
    },
    "RuleCondition": {
      "name": "RuleCondition",
      "plural": "RuleConditions",
      "description": "Class for conditions that can be attached to a single rule",
      "code": "rucr",
      "properties": {
        "expression": {
          "access": "rw",
          "type": "string",
          "description": "Rule expression field",
          "code": "rexp",
          "optional": false
        },
        "header": {
          "access": "rw",
          "type": "string",
          "description": "Rule header key",
          "code": "rhed",
          "optional": false
        },
        "qualifier": {
          "access": "rw",
          "type": "string",
          "description": "Rule qualifier",
          "code": "rqua",
          "optional": false
        },
        "ruleType": {
          "access": "rw",
          "type": "string",
          "description": "Rule type",
          "code": "rtyp",
          "optional": false
        }
      }
    },
    "Recipient": {
      "name": "Recipient",
      "plural": "Recipients",
      "description": "An email recipient",
      "code": "rcpt",
      "properties": {
        "address": {
          "access": "rw",
          "type": "string",
          "description": "The recipients email address",
          "code": "radd",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name used for display",
          "code": "pnam",
          "optional": false
        }
      }
    },
    "BccRecipient": {
      "name": "BccRecipient",
      "plural": "BccRecipients",
      "description": "An email recipient in the Bcc: field",
      "code": "brcp",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this recipient",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "CcRecipient": {
      "name": "CcRecipient",
      "plural": "CcRecipients",
      "description": "An email recipient in the Cc: field",
      "code": "crcp",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this recipient",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "ToRecipient": {
      "name": "ToRecipient",
      "plural": "ToRecipients",
      "description": "An email recipient in the To: field",
      "code": "trcp",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this recipient",
          "code": "ID  ",
          "optional": false
        }
      }
    },
    "Header": {
      "name": "Header",
      "plural": "Headers",
      "description": "A header value for a message. E.g. To, Subject, From.",
      "code": "mhdr",
      "properties": {
        "content": {
          "access": "rw",
          "type": "string",
          "description": "Contents of the header",
          "code": "ctnt",
          "optional": false
        },
        "name": {
          "access": "rw",
          "type": "string",
          "description": "Name of the header value",
          "code": "pnam",
          "optional": false
        }
      }
    },
    "MailAttachment": {
      "name": "MailAttachment",
      "plural": "MailAttachments",
      "description": "A file attached to a received message.",
      "code": "attc",
      "properties": {
        "name": {
          "access": "r",
          "type": "string",
          "description": "Name of the attachment",
          "code": "pnam",
          "optional": false
        },
        "mIMEType": {
          "access": "r",
          "type": "string",
          "description": "MIME type of the attachment E.g. text/plain.",
          "code": "attp",
          "optional": false
        },
        "fileSize": {
          "access": "r",
          "type": "integer",
          "description": "Approximate size in bytes.",
          "code": "atsz",
          "optional": false
        },
        "downloaded": {
          "access": "r",
          "type": "boolean",
          "description": "Indicates whether the attachment has been downloaded.",
          "code": "atdn",
          "optional": false
        },
        "id": {
          "access": "r",
          "type": "string",
          "description": "The unique identifier of the attachment.",
          "code": "ID  ",
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
    "SaveableFileFormat": {
      "name": "SaveableFileFormat",
      "code": "savf",
      "values": [
        {
          "name": "nativeFormat",
          "value": "nativeFormat",
          "description": "Native format",
          "code": "item"
        }
      ]
    },
    "DefaultMessageFormat": {
      "name": "DefaultMessageFormat",
      "code": "edmf",
      "values": [
        {
          "name": "plainFormat",
          "value": "plainFormat",
          "description": "Plain Text",
          "code": "dmpt"
        },
        {
          "name": "richFormat",
          "value": "richFormat",
          "description": "Rich Text",
          "code": "dmrt"
        }
      ]
    },
    "HeaderDetail": {
      "name": "HeaderDetail",
      "code": "hede",
      "values": [
        {
          "name": "all",
          "value": "all",
          "description": "All",
          "code": "hdal"
        },
        {
          "name": "custom",
          "value": "custom",
          "description": "Custom",
          "code": "hdcu"
        },
        {
          "name": "default",
          "value": "default",
          "description": "Default",
          "code": "hdde"
        },
        {
          "name": "noHeaders",
          "value": "noHeaders",
          "description": "No headers",
          "code": "hdnn"
        }
      ]
    },
    "LdapScope": {
      "name": "LdapScope",
      "code": "ldas",
      "values": [
        {
          "name": "base",
          "value": "base",
          "description": "LDAP scope of 'Base'",
          "code": "lsba"
        },
        {
          "name": "oneLevel",
          "value": "oneLevel",
          "description": "LDAP scope of 'One Level'",
          "code": "lsol"
        },
        {
          "name": "subtree",
          "value": "subtree",
          "description": "LDAP scope of 'Subtree'",
          "code": "lsst"
        }
      ]
    },
    "QuotingColor": {
      "name": "QuotingColor",
      "code": "qqcl",
      "values": [
        {
          "name": "blue",
          "value": "blue",
          "description": "Blue",
          "code": "ccbl"
        },
        {
          "name": "green",
          "value": "green",
          "description": "Green",
          "code": "ccgr"
        },
        {
          "name": "orange",
          "value": "orange",
          "description": "Orange",
          "code": "ccor"
        },
        {
          "name": "other",
          "value": "other",
          "description": "Other",
          "code": "ccot"
        },
        {
          "name": "purple",
          "value": "purple",
          "description": "Purple",
          "code": "ccpu"
        },
        {
          "name": "red",
          "value": "red",
          "description": "Red",
          "code": "ccre"
        },
        {
          "name": "yellow",
          "value": "yellow",
          "description": "Yellow",
          "code": "ccye"
        }
      ]
    },
    "ViewerColumns": {
      "name": "ViewerColumns",
      "code": "mvcl",
      "values": [
        {
          "name": "attachmentsColumn",
          "value": "attachmentsColumn",
          "description": "Column containing the number of attachments a message contains",
          "code": "ecat"
        },
        {
          "name": "messageColor",
          "value": "messageColor",
          "description": "Used to indicate sorting should be done by color",
          "code": "eccl"
        },
        {
          "name": "dateReceivedColumn",
          "value": "dateReceivedColumn",
          "description": "Column containing the date a message was received",
          "code": "ecdr"
        },
        {
          "name": "dateSentColumn",
          "value": "dateSentColumn",
          "description": "Column containing the date a message was sent",
          "code": "ecds"
        },
        {
          "name": "flagsColumn",
          "value": "flagsColumn",
          "description": "Column containing the flags of a message",
          "code": "ecfl"
        },
        {
          "name": "fromColumn",
          "value": "fromColumn",
          "description": "Column containing the sender's name",
          "code": "ecfr"
        },
        {
          "name": "mailboxColumn",
          "value": "mailboxColumn",
          "description": "Column containing the name of the mailbox or account a message is in",
          "code": "ecmb"
        },
        {
          "name": "messageStatusColumn",
          "value": "messageStatusColumn",
          "description": "Column indicating a messages status (read, unread, replied to, forwarded, etc)",
          "code": "ecms"
        },
        {
          "name": "numberColumn",
          "value": "numberColumn",
          "description": "Column containing the number of a message in a mailbox",
          "code": "ecnm"
        },
        {
          "name": "sizeColumn",
          "value": "sizeColumn",
          "description": "Column containing the size of a message",
          "code": "ecsz"
        },
        {
          "name": "subjectColumn",
          "value": "subjectColumn",
          "description": "Column containing the subject of a message",
          "code": "ecsu"
        },
        {
          "name": "toColumn",
          "value": "toColumn",
          "description": "Column containing the recipients of a message",
          "code": "ecto"
        },
        {
          "name": "dateLastSavedColumn",
          "value": "dateLastSavedColumn",
          "description": "Column containing the date a draft message was saved",
          "code": "ecls"
        }
      ]
    },
    "Authentication": {
      "name": "Authentication",
      "code": "exut",
      "values": [
        {
          "name": "password",
          "value": "password",
          "description": "Clear text password",
          "code": "axct"
        },
        {
          "name": "apop",
          "value": "apop",
          "description": "APOP",
          "code": "aapo"
        },
        {
          "name": "kerberos5",
          "value": "kerberos5",
          "description": "Kerberos V5 (GSSAPI)",
          "code": "axk5"
        },
        {
          "name": "ntlm",
          "value": "ntlm",
          "description": "NTLM",
          "code": "axnt"
        },
        {
          "name": "md5",
          "value": "md5",
          "description": "CRAM-MD5",
          "code": "axmd"
        },
        {
          "name": "external",
          "value": "external",
          "description": "External authentication (TLS client certificate)",
          "code": "aext"
        },
        {
          "name": "appleToken",
          "value": "appleToken",
          "description": "Apple token",
          "code": "atok"
        },
        {
          "name": "none",
          "value": "none",
          "description": "None",
          "code": "ccno"
        }
      ]
    },
    "HighlightColors": {
      "name": "HighlightColors",
      "code": "cclr",
      "values": [
        {
          "name": "blue",
          "value": "blue",
          "description": "Blue",
          "code": "ccbl"
        },
        {
          "name": "gray",
          "value": "gray",
          "description": "Gray",
          "code": "ccgy"
        },
        {
          "name": "green",
          "value": "green",
          "description": "Green",
          "code": "ccgr"
        },
        {
          "name": "none",
          "value": "none",
          "description": "None",
          "code": "ccno"
        },
        {
          "name": "orange",
          "value": "orange",
          "description": "Orange",
          "code": "ccor"
        },
        {
          "name": "other",
          "value": "other",
          "description": "Other",
          "code": "ccot"
        },
        {
          "name": "purple",
          "value": "purple",
          "description": "Purple",
          "code": "ccpu"
        },
        {
          "name": "red",
          "value": "red",
          "description": "Red",
          "code": "ccre"
        },
        {
          "name": "yellow",
          "value": "yellow",
          "description": "Yellow",
          "code": "ccye"
        }
      ]
    },
    "MessageCachingPolicy": {
      "name": "MessageCachingPolicy",
      "code": "e9xp",
      "values": [
        {
          "name": "doNotKeepCopiesOfAnyMessages",
          "value": "doNotKeepCopiesOfAnyMessages",
          "description": "Do not use this option (deprecated). If you do, Mail will use the 'all messages but omit attachments' policy",
          "code": "x9no"
        },
        {
          "name": "onlyMessagesIHaveRead",
          "value": "onlyMessagesIHaveRead",
          "description": "Do not use this option (deprecated). If you do, Mail will use the 'all messages but omit attachments' policy",
          "code": "x9wr"
        },
        {
          "name": "allMessagesButOmitAttachments",
          "value": "allMessagesButOmitAttachments",
          "description": "All messages but omit attachments",
          "code": "x9bo"
        },
        {
          "name": "allMessagesAndTheirAttachments",
          "value": "allMessagesAndTheirAttachments",
          "description": "All messages and their attachments",
          "code": "x9al"
        }
      ]
    },
    "RuleQualifier": {
      "name": "RuleQualifier",
      "code": "enrq",
      "values": [
        {
          "name": "beginsWithValue",
          "value": "beginsWithValue",
          "description": "Begins with value",
          "code": "rqbw"
        },
        {
          "name": "doesContainValue",
          "value": "doesContainValue",
          "description": "Does contain value",
          "code": "rqco"
        },
        {
          "name": "doesNotContainValue",
          "value": "doesNotContainValue",
          "description": "Does not contain value",
          "code": "rqdn"
        },
        {
          "name": "endsWithValue",
          "value": "endsWithValue",
          "description": "Ends with value",
          "code": "rqew"
        },
        {
          "name": "equalToValue",
          "value": "equalToValue",
          "description": "Equal to value",
          "code": "rqie"
        },
        {
          "name": "lessThanValue",
          "value": "lessThanValue",
          "description": "Less than value",
          "code": "rqlt"
        },
        {
          "name": "greaterThanValue",
          "value": "greaterThanValue",
          "description": "Greater than value",
          "code": "rqgt"
        },
        {
          "name": "none",
          "value": "none",
          "description": "Indicates no qualifier is applicable",
          "code": "rqno"
        }
      ]
    },
    "RuleType": {
      "name": "RuleType",
      "code": "erut",
      "values": [
        {
          "name": "account",
          "value": "account",
          "description": "Account",
          "code": "tacc"
        },
        {
          "name": "anyRecipient",
          "value": "anyRecipient",
          "description": "Any recipient",
          "code": "tanr"
        },
        {
          "name": "ccHeader",
          "value": "ccHeader",
          "description": "Cc header",
          "code": "tccc"
        },
        {
          "name": "matchesEveryMessage",
          "value": "matchesEveryMessage",
          "description": "Every message",
          "code": "tevm"
        },
        {
          "name": "fromHeader",
          "value": "fromHeader",
          "description": "From header",
          "code": "tfro"
        },
        {
          "name": "headerKey",
          "value": "headerKey",
          "description": "An arbitrary header key",
          "code": "thdk"
        },
        {
          "name": "messageContent",
          "value": "messageContent",
          "description": "Message content",
          "code": "tmec"
        },
        {
          "name": "messageIsJunkMail",
          "value": "messageIsJunkMail",
          "description": "Message is junk mail",
          "code": "tmij"
        },
        {
          "name": "senderIsInMyContacts",
          "value": "senderIsInMyContacts",
          "description": "Sender is in my contacts",
          "code": "tsii"
        },
        {
          "name": "senderIsInMyPreviousRecipients",
          "value": "senderIsInMyPreviousRecipients",
          "description": "Sender is in my previous recipients",
          "code": "tsah"
        },
        {
          "name": "senderIsMemberOfGroup",
          "value": "senderIsMemberOfGroup",
          "description": "Sender is member of group",
          "code": "tsim"
        },
        {
          "name": "senderIsNotInMyContacts",
          "value": "senderIsNotInMyContacts",
          "description": "Sender is not in my contacts",
          "code": "tsin"
        },
        {
          "name": "senderIsNotInMyPreviousRecipients",
          "value": "senderIsNotInMyPreviousRecipients",
          "description": "sender is not in my previous recipients",
          "code": "tnah"
        },
        {
          "name": "senderIsNotMemberOfGroup",
          "value": "senderIsNotMemberOfGroup",
          "description": "Sender is not member of group",
          "code": "tsig"
        },
        {
          "name": "senderIsVIP",
          "value": "senderIsVIP",
          "description": "Sender is VIP",
          "code": "tsig"
        },
        {
          "name": "subjectHeader",
          "value": "subjectHeader",
          "description": "Subject header",
          "code": "tsub"
        },
        {
          "name": "toHeader",
          "value": "toHeader",
          "description": "To header",
          "code": "ttoo"
        },
        {
          "name": "toOrCcHeader",
          "value": "toOrCcHeader",
          "description": "To or Cc header",
          "code": "ttoc"
        },
        {
          "name": "attachmentType",
          "value": "attachmentType",
          "description": "Attachment Type",
          "code": "tatt"
        }
      ]
    },
    "TypeOfAccount": {
      "name": "TypeOfAccount",
      "code": "etoc",
      "values": [
        {
          "name": "pop",
          "value": "pop",
          "description": "POP",
          "code": "etpo"
        },
        {
          "name": "smtp",
          "value": "smtp",
          "description": "SMTP",
          "code": "etsm"
        },
        {
          "name": "imap",
          "value": "imap",
          "description": "IMAP",
          "code": "etim"
        },
        {
          "name": "iCloud",
          "value": "iCloud",
          "description": "iCloud",
          "code": "etit"
        },
        {
          "name": "unknown",
          "value": "unknown",
          "description": "Unknown",
          "code": "etun"
        }
      ]
    }
  },
  "hierarchy": {
    "children": {
      "accounts": {
        "resource": "Account",
        "access": "rw",
        "description": "A Mail account for receiving messages (POP/IMAP). To create a new receiving account, use the 'pop account', 'imap account', and 'iCloud account' objects",
        "children": {
          "mailboxes": {
            "resource": "Mailbox",
            "access": "rw",
            "description": "A mailbox that holds messages",
            "children": {
              "messages": {
                "resource": "Message",
                "access": "rw",
                "description": "An email message",
                "children": {
                  "bccRecipients": {
                    "resource": "BccRecipient",
                    "access": "rw",
                    "description": "An email recipient in the Bcc: field"
                  },
                  "ccRecipients": {
                    "resource": "CcRecipient",
                    "access": "rw",
                    "description": "An email recipient in the Cc: field"
                  },
                  "recipients": {
                    "resource": "Recipient",
                    "access": "rw",
                    "description": "An email recipient"
                  },
                  "toRecipients": {
                    "resource": "ToRecipient",
                    "access": "rw",
                    "description": "An email recipient in the To: field"
                  },
                  "headers": {
                    "resource": "Header",
                    "access": "rw",
                    "description": "A header value for a message. E.g. To, Subject, From."
                  },
                  "mailAttachments": {
                    "resource": "MailAttachment",
                    "access": "rw",
                    "description": "A file attached to a received message."
                  }
                }
              }
            }
          }
        }
      },
      "outgoingMessages": {
        "resource": "OutgoingMessage",
        "access": "rw",
        "description": "A new email message",
        "children": {
          "bccRecipients": {
            "resource": "BccRecipient",
            "access": "rw",
            "description": "An email recipient in the Bcc: field"
          },
          "ccRecipients": {
            "resource": "CcRecipient",
            "access": "rw",
            "description": "An email recipient in the Cc: field"
          },
          "recipients": {
            "resource": "Recipient",
            "access": "rw",
            "description": "An email recipient"
          },
          "toRecipients": {
            "resource": "ToRecipient",
            "access": "rw",
            "description": "An email recipient in the To: field"
          }
        }
      },
      "mailboxes": {
        "resource": "Mailbox",
        "access": "rw",
        "description": "A mailbox that holds messages",
        "children": {
          "messages": {
            "resource": "Message",
            "access": "rw",
            "description": "An email message",
            "children": {
              "bccRecipients": {
                "resource": "BccRecipient",
                "access": "rw",
                "description": "An email recipient in the Bcc: field"
              },
              "ccRecipients": {
                "resource": "CcRecipient",
                "access": "rw",
                "description": "An email recipient in the Cc: field"
              },
              "recipients": {
                "resource": "Recipient",
                "access": "rw",
                "description": "An email recipient"
              },
              "toRecipients": {
                "resource": "ToRecipient",
                "access": "rw",
                "description": "An email recipient in the To: field"
              },
              "headers": {
                "resource": "Header",
                "access": "rw",
                "description": "A header value for a message. E.g. To, Subject, From."
              },
              "mailAttachments": {
                "resource": "MailAttachment",
                "access": "rw",
                "description": "A file attached to a received message."
              }
            }
          }
        }
      },
      "messageViewers": {
        "resource": "MessageViewer",
        "access": "rw",
        "description": "Represents the object responsible for managing a viewer window",
        "children": {
          "messages": {
            "resource": "Message",
            "access": "rw",
            "description": "An email message",
            "children": {
              "bccRecipients": {
                "resource": "BccRecipient",
                "access": "rw",
                "description": "An email recipient in the Bcc: field"
              },
              "ccRecipients": {
                "resource": "CcRecipient",
                "access": "rw",
                "description": "An email recipient in the Cc: field"
              },
              "recipients": {
                "resource": "Recipient",
                "access": "rw",
                "description": "An email recipient"
              },
              "toRecipients": {
                "resource": "ToRecipient",
                "access": "rw",
                "description": "An email recipient in the To: field"
              },
              "headers": {
                "resource": "Header",
                "access": "rw",
                "description": "A header value for a message. E.g. To, Subject, From."
              },
              "mailAttachments": {
                "resource": "MailAttachment",
                "access": "rw",
                "description": "A file attached to a received message."
              }
            }
          }
        }
      },
      "rules": {
        "resource": "Rule",
        "access": "rw",
        "description": "Class for message rules",
        "children": {
          "ruleConditions": {
            "resource": "RuleCondition",
            "access": "rw",
            "description": "Class for conditions that can be attached to a single rule"
          }
        }
      }
    }
  },
  "relationships": [],
  "commands": {
    "delete": {
      "name": "delete",
      "description": "Delete an object.",
      "scope": "application",
      "parameters": [],
      "code": "delo"
    },
    "duplicate": {
      "name": "duplicate",
      "description": "Copy an object.",
      "scope": "application",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "The location for the new copy or copies.",
          "required": false,
          "code": "insh"
        },
        {
          "name": "withProperties",
          "type": "any",
          "description": "Properties to set in the new copy or copies right away.",
          "required": false,
          "code": "prdt"
        }
      ],
      "code": "clon"
    },
    "move": {
      "name": "move",
      "description": "Move an object to a new location.",
      "scope": "application",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "The new location for the object(s).",
          "required": true,
          "code": "insh"
        }
      ],
      "code": "move"
    },
    "bounce": {
      "name": "bounce",
      "description": "Does nothing at all (deprecated)",
      "scope": "resource",
      "resourceType": "Message",
      "parameters": [],
      "code": "bcms"
    },
    "checkForNewMail": {
      "name": "checkForNewMail",
      "description": "Triggers a check for email.",
      "scope": "application",
      "parameters": [
        {
          "name": "for",
          "type": {
            "resource": "account"
          },
          "description": "Specify the account that you wish to check for mail",
          "required": false,
          "code": "acna"
        }
      ],
      "code": "chma"
    },
    "extractNameFrom": {
      "name": "extractNameFrom",
      "description": "Command to get the full name out of a fully specified email address. E.g. Calling this with \"John Doe <jdoe@example.com>\" as the direct object would return \"John Doe\"",
      "scope": "application",
      "parameters": [],
      "code": "eafn"
    },
    "extractAddressFrom": {
      "name": "extractAddressFrom",
      "description": "Command to get just the email address of a fully specified email address. E.g. Calling this with \"John Doe <jdoe@example.com>\" as the direct object would return \"jdoe@example.com\"",
      "scope": "application",
      "parameters": [],
      "code": "eaua"
    },
    "forward": {
      "name": "forward",
      "description": "Creates a forwarded message.",
      "scope": "resource",
      "resourceType": "Message",
      "parameters": [
        {
          "name": "openingWindow",
          "type": "boolean",
          "description": "Whether the window for the forwarded message is shown. Default is to not show the window.",
          "required": false,
          "code": "ropw"
        }
      ],
      "code": "fwms"
    },
    "getURL": {
      "name": "getURL",
      "description": "Opens a mailto URL.",
      "scope": "application",
      "parameters": [],
      "code": "emtg"
    },
    "importMailMailbox": {
      "name": "importMailMailbox",
      "description": "Imports a mailbox created by Mail.",
      "scope": "application",
      "parameters": [
        {
          "name": "at",
          "type": "file",
          "description": "the mailbox or folder of mailboxes to import",
          "required": true,
          "code": "mbpt"
        }
      ],
      "code": "immx"
    },
    "mailto": {
      "name": "mailto",
      "description": "Opens a mailto URL.",
      "scope": "application",
      "parameters": [],
      "code": "emto"
    },
    "performMailActionWithMessages": {
      "name": "performMailActionWithMessages",
      "description": "Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.",
      "scope": "application",
      "parameters": [
        {
          "name": "inMailboxes",
          "type": {
            "resource": "mailbox"
          },
          "description": "If the script is being executed by the user selecting an item in the scripts menu, this argument will specify the mailboxes that are currently selected. Otherwise it will not be specified.",
          "required": false,
          "code": "pmbx"
        },
        {
          "name": "forRule",
          "type": {
            "resource": "rule"
          },
          "description": "If the script is being executed by a rule action, this argument will be the rule being invoked. Otherwise it will not be specified.",
          "required": false,
          "code": "pmar"
        }
      ],
      "code": "cpma"
    },
    "redirect": {
      "name": "redirect",
      "description": "Creates a redirected message.",
      "scope": "resource",
      "resourceType": "Message",
      "parameters": [
        {
          "name": "openingWindow",
          "type": "boolean",
          "description": "Whether the window for the redirected message is shown. Default is to not show the window.",
          "required": false,
          "code": "ropw"
        }
      ],
      "code": "rdms"
    },
    "reply": {
      "name": "reply",
      "description": "Creates a reply message.",
      "scope": "resource",
      "resourceType": "Message",
      "parameters": [
        {
          "name": "openingWindow",
          "type": "boolean",
          "description": "Whether the window for the reply message is shown. Default is to not show the window.",
          "required": false,
          "code": "ropw"
        },
        {
          "name": "replyToAll",
          "type": "boolean",
          "description": "Whether to reply to all recipients. Default is to reply to the sender only.",
          "required": false,
          "code": "rpal"
        }
      ],
      "code": "rpms"
    },
    "send": {
      "name": "send",
      "description": "Sends a message.",
      "scope": "resource",
      "resourceType": "OutgoingMessage",
      "parameters": [],
      "code": "send"
    },
    "synchronize": {
      "name": "synchronize",
      "description": "Command to trigger synchronizing of an IMAP account with the server.",
      "scope": "application",
      "parameters": [
        {
          "name": "with",
          "type": {
            "resource": "account"
          },
          "description": "The account to synchronize",
          "required": true,
          "code": "acna"
        }
      ],
      "code": "syac"
    }
  }
} as AppManifest,
} as const;
