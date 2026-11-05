/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { SaveableFileFormat } from './contract/index.js'

export type { DefaultMessageFormat } from './contract/index.js'

export type { HeaderDetail } from './contract/index.js'

export type { LdapScope } from './contract/index.js'

export type { QuotingColor } from './contract/index.js'

export type { ViewerColumns } from './contract/index.js'

export type { Authentication } from './contract/index.js'

export type { HighlightColors } from './contract/index.js'

export type { MessageCachingPolicy } from './contract/index.js'

export type { RuleQualifier } from './contract/index.js'

export type { RuleType } from './contract/index.js'

export type { TypeOfAccount } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RichText } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RichTextCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RichTextUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Attachment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AttachmentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AttachmentUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Paragraph } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ParagraphCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ParagraphUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Word } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { WordCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { WordUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Character } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { CharacterCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { CharacterUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AttributeRun } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AttributeRunCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AttributeRunUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { OutgoingMessage } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { OutgoingMessageCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { OutgoingMessageUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MessageViewer } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MessageViewerCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MessageViewerUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Message } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MessageCreateInput = Omit<
  import('./contract/index.js').MessageCreateInput,
  'flagIndex'
> & {
  /** The flag on the message, or -1 if the message is not flagged Numeric values are validated by the contract before dispatch. */
  flagIndex?: null extends import('./contract/index.js').MessageCreateInput['flagIndex']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type MessageUpdateInput = Omit<
  import('./contract/index.js').MessageUpdateInput,
  'flagIndex'
> & {
  /** The flag on the message, or -1 if the message is not flagged Numeric values are validated by the contract before dispatch. */
  flagIndex?: null extends import('./contract/index.js').MessageUpdateInput['flagIndex']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Account } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AccountCreateInput = Omit<
  import('./contract/index.js').AccountCreateInput,
  'emptyJunkMessagesFrequency' | 'emptySentMessagesFrequency' | 'emptyTrashFrequency' | 'port'
> & {
  /** Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete) Numeric values are validated by the contract before dispatch. */
  emptyJunkMessagesFrequency?: null extends import('./contract/index.js').AccountCreateInput['emptyJunkMessagesFrequency']
    ? number | null
    : number
  /** Does nothing at all (deprecated) Numeric values are validated by the contract before dispatch. */
  emptySentMessagesFrequency?: null extends import('./contract/index.js').AccountCreateInput['emptySentMessagesFrequency']
    ? number | null
    : number
  /** Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 = never delete) Numeric values are validated by the contract before dispatch. */
  emptyTrashFrequency?: null extends import('./contract/index.js').AccountCreateInput['emptyTrashFrequency']
    ? number | null
    : number
  /** The port used to connect to an account Numeric values are validated by the contract before dispatch. */
  port?: null extends import('./contract/index.js').AccountCreateInput['port']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type AccountUpdateInput = Omit<
  import('./contract/index.js').AccountUpdateInput,
  'emptyJunkMessagesFrequency' | 'emptySentMessagesFrequency' | 'emptyTrashFrequency' | 'port'
> & {
  /** Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete) Numeric values are validated by the contract before dispatch. */
  emptyJunkMessagesFrequency?: null extends import('./contract/index.js').AccountUpdateInput['emptyJunkMessagesFrequency']
    ? number | null
    : number
  /** Does nothing at all (deprecated) Numeric values are validated by the contract before dispatch. */
  emptySentMessagesFrequency?: null extends import('./contract/index.js').AccountUpdateInput['emptySentMessagesFrequency']
    ? number | null
    : number
  /** Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 = never delete) Numeric values are validated by the contract before dispatch. */
  emptyTrashFrequency?: null extends import('./contract/index.js').AccountUpdateInput['emptyTrashFrequency']
    ? number | null
    : number
  /** The port used to connect to an account Numeric values are validated by the contract before dispatch. */
  port?: null extends import('./contract/index.js').AccountUpdateInput['port']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Mailbox } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MailboxCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MailboxUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Rule } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type RuleCreateInput = Omit<
  import('./contract/index.js').RuleCreateInput,
  'markFlagIndex'
> & {
  /** If rule matches, mark message with the specified flag. Set to -1 to disable this action Numeric values are validated by the contract before dispatch. */
  markFlagIndex?: null extends import('./contract/index.js').RuleCreateInput['markFlagIndex']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type RuleUpdateInput = Omit<
  import('./contract/index.js').RuleUpdateInput,
  'markFlagIndex'
> & {
  /** If rule matches, mark message with the specified flag. Set to -1 to disable this action Numeric values are validated by the contract before dispatch. */
  markFlagIndex?: null extends import('./contract/index.js').RuleUpdateInput['markFlagIndex']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RuleCondition } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RuleConditionCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RuleConditionUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Recipient } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RecipientCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RecipientUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { BccRecipient } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { BccRecipientCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { BccRecipientUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { CcRecipient } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { CcRecipientCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { CcRecipientUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ToRecipient } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ToRecipientCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ToRecipientUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Header } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { HeaderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { HeaderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MailAttachment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MailAttachmentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MailAttachmentUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RichTextSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AttachmentSchema = z.object({
  fileName: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ParagraphSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const WordSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CharacterSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AttributeRunSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const OutgoingMessageSchema = z.object({
  sender: z.string(),
  subject: z.string(),
  visible: z.boolean(),
  messageSignature: z.string(),
  id: z.number(),
  htmlContent: z.string(),
  vcardPath: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MessageViewerSchema = z.object({
  sortColumn: z.string(),
  sortedAscending: z.boolean(),
  mailboxListVisible: z.boolean(),
  previewPaneIsVisible: z.boolean(),
  visibleColumns: z.string(),
  id: z.number(),
  visibleMessages: z.string(),
  selectedMessages: z.string(),
  selectedMailboxes: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MessageSchema = z.object({
  id: z.number(),
  allHeaders: z.string(),
  backgroundColor: z.string(),
  dateReceived: z.string(),
  dateSent: z.string(),
  deletedStatus: z.boolean(),
  flaggedStatus: z.boolean(),
  flagIndex: z.number(),
  junkMailStatus: z.boolean(),
  readStatus: z.boolean(),
  messageId: z.string(),
  source: z.string(),
  replyTo: z.string(),
  messageSize: z.number(),
  sender: z.string(),
  subject: z.string(),
  wasForwarded: z.boolean(),
  wasRedirected: z.boolean(),
  wasRepliedTo: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AccountSchema = z.object({
  deliveryAccount: z.string(),
  name: z.string(),
  id: z.string(),
  password: z.string(),
  authentication: z.string(),
  accountType: z.string(),
  emailAddresses: z.string(),
  fullName: z.string(),
  emptyJunkMessagesFrequency: z.number(),
  emptySentMessagesFrequency: z.number(),
  emptyTrashFrequency: z.number(),
  emptyJunkMessagesOnQuit: z.boolean(),
  emptySentMessagesOnQuit: z.boolean(),
  emptyTrashOnQuit: z.boolean(),
  enabled: z.boolean(),
  userName: z.string(),
  accountDirectory: z.string(),
  port: z.number(),
  serverName: z.string(),
  includeWhenGettingNewMail: z.boolean(),
  moveDeletedMessagesToTrash: z.boolean(),
  usesSsl: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MailboxSchema = z.object({
  name: z.string(),
  unreadCount: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RuleSchema = z.object({
  colorMessage: z.string(),
  deleteMessage: z.boolean(),
  forwardText: z.string(),
  forwardMessage: z.string(),
  markFlagged: z.boolean(),
  markFlagIndex: z.number(),
  markRead: z.boolean(),
  playSound: z.string(),
  redirectMessage: z.string(),
  replyText: z.string(),
  runScript: z.string(),
  allConditionsMustBeMet: z.boolean(),
  highlightTextUsingColor: z.boolean(),
  enabled: z.boolean(),
  name: z.string(),
  shouldCopyMessage: z.boolean(),
  shouldMoveMessage: z.boolean(),
  stopEvaluatingRules: z.boolean(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RuleConditionSchema = z.object({
  expression: z.string(),
  header: z.string(),
  qualifier: z.string(),
  ruleType: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RecipientSchema = z.object({
  address: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const BccRecipientSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CcRecipientSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ToRecipientSchema = z.object({
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const HeaderSchema = z.object({
  content: z.string(),
  name: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MailAttachmentSchema = z.object({
  name: z.string(),
  mIMEType: z.string(),
  fileSize: z.number(),
  downloaded: z.boolean(),
  id: z.string(),
})
