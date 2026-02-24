/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** SaveableFileFormat */
export type SaveableFileFormat = 'nativeFormat';

/** DefaultMessageFormat */
export type DefaultMessageFormat = 'plainFormat' | 'richFormat';

/** HeaderDetail */
export type HeaderDetail = 'all' | 'custom' | 'default' | 'noHeaders';

/** LdapScope */
export type LdapScope = 'base' | 'oneLevel' | 'subtree';

/** QuotingColor */
export type QuotingColor = 'blue' | 'green' | 'orange' | 'other' | 'purple' | 'red' | 'yellow';

/** ViewerColumns */
export type ViewerColumns = 'attachmentsColumn' | 'messageColor' | 'dateReceivedColumn' | 'dateSentColumn' | 'flagsColumn' | 'fromColumn' | 'mailboxColumn' | 'messageStatusColumn' | 'numberColumn' | 'sizeColumn' | 'subjectColumn' | 'toColumn' | 'dateLastSavedColumn';

/** Authentication */
export type Authentication = 'password' | 'apop' | 'kerberos5' | 'ntlm' | 'md5' | 'external' | 'appleToken' | 'none';

/** HighlightColors */
export type HighlightColors = 'blue' | 'gray' | 'green' | 'none' | 'orange' | 'other' | 'purple' | 'red' | 'yellow';

/** MessageCachingPolicy */
export type MessageCachingPolicy = 'doNotKeepCopiesOfAnyMessages' | 'onlyMessagesIHaveRead' | 'allMessagesButOmitAttachments' | 'allMessagesAndTheirAttachments';

/** RuleQualifier */
export type RuleQualifier = 'beginsWithValue' | 'doesContainValue' | 'doesNotContainValue' | 'endsWithValue' | 'equalToValue' | 'lessThanValue' | 'greaterThanValue' | 'none';

/** RuleType */
export type RuleType = 'account' | 'anyRecipient' | 'ccHeader' | 'matchesEveryMessage' | 'fromHeader' | 'headerKey' | 'messageContent' | 'messageIsJunkMail' | 'senderIsInMyContacts' | 'senderIsInMyPreviousRecipients' | 'senderIsMemberOfGroup' | 'senderIsNotInMyContacts' | 'senderIsNotInMyPreviousRecipients' | 'senderIsNotMemberOfGroup' | 'senderIsVIP' | 'subjectHeader' | 'toHeader' | 'toOrCcHeader' | 'attachmentType';

/** TypeOfAccount */
export type TypeOfAccount = 'pop' | 'smtp' | 'imap' | 'iCloud' | 'unknown';

/** Rich (styled) text */
export interface RichText {
  /** The color of the first character. */
  color: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font: string;
  /** The size in points of the first character. */
  size: number;
}

/** Input for creating a RichText */
export interface RichTextCreateInput {
  /** The color of the first character. */
  color?: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font?: string;
  /** The size in points of the first character. */
  size?: number;
}

/** Input for updating a RichText */
export type RichTextUpdateInput = Partial<RichTextCreateInput>;

/** Represents an inline text attachment. This class is used mainly for make commands. */
export interface Attachment {
  /** The file for the attachment */
  fileName: string;
}

/** Input for creating a Attachment */
export interface AttachmentCreateInput {
  /** The file for the attachment */
  fileName?: string;
}

/** Input for updating a Attachment */
export type AttachmentUpdateInput = Partial<AttachmentCreateInput>;

/** This subdivides the text into paragraphs. */
export interface Paragraph {
  /** The color of the first character. */
  color: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font: string;
  /** The size in points of the first character. */
  size: number;
}

/** Input for creating a Paragraph */
export interface ParagraphCreateInput {
  /** The color of the first character. */
  color?: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font?: string;
  /** The size in points of the first character. */
  size?: number;
}

/** Input for updating a Paragraph */
export type ParagraphUpdateInput = Partial<ParagraphCreateInput>;

/** This subdivides the text into words. */
export interface Word {
  /** The color of the first character. */
  color: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font: string;
  /** The size in points of the first character. */
  size: number;
}

/** Input for creating a Word */
export interface WordCreateInput {
  /** The color of the first character. */
  color?: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font?: string;
  /** The size in points of the first character. */
  size?: number;
}

/** Input for updating a Word */
export type WordUpdateInput = Partial<WordCreateInput>;

/** This subdivides the text into characters. */
export interface Character {
  /** The color of the character. */
  color: { r: number; g: number; b: number };
  /** The name of the font of the character. */
  font: string;
  /** The size in points of the character. */
  size: number;
}

/** Input for creating a Character */
export interface CharacterCreateInput {
  /** The color of the character. */
  color?: { r: number; g: number; b: number };
  /** The name of the font of the character. */
  font?: string;
  /** The size in points of the character. */
  size?: number;
}

/** Input for updating a Character */
export type CharacterUpdateInput = Partial<CharacterCreateInput>;

/** This subdivides the text into chunks that all have the same attributes. */
export interface AttributeRun {
  /** The color of the first character. */
  color: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font: string;
  /** The size in points of the first character. */
  size: number;
}

/** Input for creating a AttributeRun */
export interface AttributeRunCreateInput {
  /** The color of the first character. */
  color?: { r: number; g: number; b: number };
  /** The name of the font of the first character. */
  font?: string;
  /** The size in points of the first character. */
  size?: number;
}

/** Input for updating a AttributeRun */
export type AttributeRunUpdateInput = Partial<AttributeRunCreateInput>;

/** A new email message */
export interface OutgoingMessage {
  /** The sender of the message */
  sender: string;
  /** The subject of the message */
  subject: string;
  /** Controls whether the message window is shown on the screen. The default is false */
  visible: boolean;
  /** The signature of the message */
  messageSignature: string;
  /** The unique identifier of the message */
  id: number;
  /** Does nothing at all (deprecated) */
  htmlContent: string;
  /** Does nothing at all (deprecated) */
  vcardPath: string;
}

/** Input for creating a OutgoingMessage */
export interface OutgoingMessageCreateInput {
  /** The sender of the message */
  sender?: string;
  /** The subject of the message */
  subject?: string;
  /** Controls whether the message window is shown on the screen. The default is false */
  visible?: boolean;
  /** The signature of the message */
  messageSignature?: string;
  /** Does nothing at all (deprecated) */
  htmlContent?: string;
  /** Does nothing at all (deprecated) */
  vcardPath?: string;
}

/** Input for updating a OutgoingMessage */
export type OutgoingMessageUpdateInput = Partial<OutgoingMessageCreateInput>;

/** Represents the object responsible for managing a viewer window */
export interface MessageViewer {
  /** The top level Drafts mailbox */
  draftsMailbox: Mailbox;
  /** The top level In mailbox */
  inbox: Mailbox;
  /** The top level Junk mailbox */
  junkMailbox: Mailbox;
  /** The top level Out mailbox */
  outbox: Mailbox;
  /** The top level Sent mailbox */
  sentMailbox: Mailbox;
  /** The top level Trash mailbox */
  trashMailbox: Mailbox;
  /** The column that is currently sorted in the viewer */
  sortColumn: string;
  /** Whether the viewer is sorted ascending or not */
  sortedAscending: boolean;
  /** Controls whether the list of mailboxes is visible or not */
  mailboxListVisible: boolean;
  /** Controls whether the preview pane of the message viewer window is visible or not */
  previewPaneIsVisible: boolean;
  /** List of columns that are visible. The subject column and the message status column will always be visible */
  visibleColumns: string;
  /** The unique identifier of the message viewer */
  id: number;
  /** List of messages currently being displayed in the viewer */
  visibleMessages: string;
  /** List of messages currently selected */
  selectedMessages: string;
  /** List of mailboxes currently selected in the list of mailboxes */
  selectedMailboxes: string;
}

/** Input for creating a MessageViewer */
export interface MessageViewerCreateInput {
  /** The column that is currently sorted in the viewer */
  sortColumn?: string;
  /** Whether the viewer is sorted ascending or not */
  sortedAscending?: boolean;
  /** Controls whether the list of mailboxes is visible or not */
  mailboxListVisible?: boolean;
  /** Controls whether the preview pane of the message viewer window is visible or not */
  previewPaneIsVisible?: boolean;
  /** List of columns that are visible. The subject column and the message status column will always be visible */
  visibleColumns?: string;
  /** List of messages currently being displayed in the viewer */
  visibleMessages?: string;
  /** List of messages currently selected */
  selectedMessages?: string;
  /** List of mailboxes currently selected in the list of mailboxes */
  selectedMailboxes?: string;
}

/** Input for updating a MessageViewer */
export type MessageViewerUpdateInput = Partial<MessageViewerCreateInput>;

/** An email message */
export interface Message {
  /** The unique identifier of the message. */
  id: number;
  /** All the headers of the message */
  allHeaders: string;
  /** The background color of the message */
  backgroundColor: string;
  /** The mailbox in which this message is filed */
  mailbox: Mailbox;
  /** Contents of an email message */
  content: unknown;
  /** The date a message was received */
  dateReceived: Date;
  /** The date a message was sent */
  dateSent: Date;
  /** Indicates whether the message is deleted or not */
  deletedStatus: boolean;
  /** Indicates whether the message is flagged or not */
  flaggedStatus: boolean;
  /** The flag on the message, or -1 if the message is not flagged */
  flagIndex: number;
  /** Indicates whether the message has been marked junk or evaluated to be junk by the junk mail filter. */
  junkMailStatus: boolean;
  /** Indicates whether the message is read or not */
  readStatus: boolean;
  /** The unique message ID string */
  messageId: string;
  /** Raw source of the message */
  source: string;
  /** The address that replies should be sent to */
  replyTo: string;
  /** The size (in bytes) of a message */
  messageSize: number;
  /** The sender of the message */
  sender: string;
  /** The subject of the message */
  subject: string;
  /** Indicates whether the message was forwarded or not */
  wasForwarded: boolean;
  /** Indicates whether the message was redirected or not */
  wasRedirected: boolean;
  /** Indicates whether the message was replied to or not */
  wasRepliedTo: boolean;
}

/** Input for creating a Message */
export interface MessageCreateInput {
  /** The background color of the message */
  backgroundColor?: string;
  /** The mailbox in which this message is filed */
  mailbox?: Mailbox;
  /** Indicates whether the message is deleted or not */
  deletedStatus?: boolean;
  /** Indicates whether the message is flagged or not */
  flaggedStatus?: boolean;
  /** The flag on the message, or -1 if the message is not flagged */
  flagIndex?: number;
  /** Indicates whether the message has been marked junk or evaluated to be junk by the junk mail filter. */
  junkMailStatus?: boolean;
  /** Indicates whether the message is read or not */
  readStatus?: boolean;
}

/** Input for updating a Message */
export type MessageUpdateInput = Partial<MessageCreateInput>;

/** A Mail account for receiving messages (POP/IMAP). To create a new receiving account, use the 'pop account', 'imap account', and 'iCloud account' objects */
export interface Account {
  /** The delivery account used when sending mail from this account */
  deliveryAccount: string;
  /** The name of an account */
  name: string;
  /** The unique identifier of the account */
  id: string;
  /** Password for this account. Can be set, but not read via scripting */
  password: string;
  /** Preferred authentication scheme for account */
  authentication: string;
  /** The type of an account */
  accountType: string;
  /** The list of email addresses configured for an account */
  emailAddresses: string;
  /** The users full name configured for an account */
  fullName: string;
  /** Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete) */
  emptyJunkMessagesFrequency: number;
  /** Does nothing at all (deprecated) */
  emptySentMessagesFrequency: number;
  /** Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 = never delete) */
  emptyTrashFrequency: number;
  /** Indicates whether the messages in the junk messages mailboxes will be deleted on quit */
  emptyJunkMessagesOnQuit: boolean;
  /** Does nothing at all (deprecated) */
  emptySentMessagesOnQuit: boolean;
  /** Indicates whether the messages in deleted messages mailboxes will be permanently deleted on quit */
  emptyTrashOnQuit: boolean;
  /** Indicates whether the account is enabled or not */
  enabled: boolean;
  /** The user name used to connect to an account */
  userName: string;
  /** The directory where the account stores things on disk */
  accountDirectory: string;
  /** The port used to connect to an account */
  port: number;
  /** The host name used to connect to an account */
  serverName: string;
  /** Does nothing at all (deprecated) */
  includeWhenGettingNewMail: boolean;
  /** Indicates whether messages that are deleted will be moved to the trash mailbox */
  moveDeletedMessagesToTrash: boolean;
  /** Indicates whether SSL is enabled for this receiving account */
  usesSsl: boolean;
}

/** Input for creating a Account */
export interface AccountCreateInput {
  /** The delivery account used when sending mail from this account */
  deliveryAccount?: string;
  /** The name of an account */
  name?: string;
  /** Password for this account. Can be set, but not read via scripting */
  password?: string;
  /** Preferred authentication scheme for account */
  authentication?: string;
  /** The list of email addresses configured for an account */
  emailAddresses?: string;
  /** The users full name configured for an account */
  fullName?: string;
  /** Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete) */
  emptyJunkMessagesFrequency?: number;
  /** Does nothing at all (deprecated) */
  emptySentMessagesFrequency?: number;
  /** Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 = never delete) */
  emptyTrashFrequency?: number;
  /** Indicates whether the messages in the junk messages mailboxes will be deleted on quit */
  emptyJunkMessagesOnQuit?: boolean;
  /** Does nothing at all (deprecated) */
  emptySentMessagesOnQuit?: boolean;
  /** Indicates whether the messages in deleted messages mailboxes will be permanently deleted on quit */
  emptyTrashOnQuit?: boolean;
  /** Indicates whether the account is enabled or not */
  enabled?: boolean;
  /** The user name used to connect to an account */
  userName?: string;
  /** The port used to connect to an account */
  port?: number;
  /** The host name used to connect to an account */
  serverName?: string;
  /** Does nothing at all (deprecated) */
  includeWhenGettingNewMail?: boolean;
  /** Indicates whether messages that are deleted will be moved to the trash mailbox */
  moveDeletedMessagesToTrash?: boolean;
  /** Indicates whether SSL is enabled for this receiving account */
  usesSsl?: boolean;
}

/** Input for updating a Account */
export type AccountUpdateInput = Partial<AccountCreateInput>;

/** A mailbox that holds messages */
export interface Mailbox {
  /** The name of a mailbox */
  name: string;
  /** The number of unread messages in the mailbox */
  unreadCount: number;
  /** The account property */
  account: Account;
  /** The container property */
  container: Mailbox;
}

/** Input for creating a Mailbox */
export interface MailboxCreateInput {
  /** The name of a mailbox */
  name?: string;
}

/** Input for updating a Mailbox */
export type MailboxUpdateInput = Partial<MailboxCreateInput>;

/** Class for message rules */
export interface Rule {
  /** If rule matches, apply this color */
  colorMessage: string;
  /** If rule matches, delete message */
  deleteMessage: boolean;
  /** If rule matches, prepend this text to the forwarded message. Set to empty string to include no prepended text */
  forwardText: string;
  /** If rule matches, forward message to this address, or multiple addresses, separated by commas. Set to empty string to disable this action */
  forwardMessage: string;
  /** If rule matches, mark message as flagged */
  markFlagged: boolean;
  /** If rule matches, mark message with the specified flag. Set to -1 to disable this action */
  markFlagIndex: number;
  /** If rule matches, mark message as read */
  markRead: boolean;
  /** If rule matches, play this sound (specify name of sound or path to sound) */
  playSound: string;
  /** If rule matches, redirect message to this address or multiple addresses, separate by commas. Set to empty string to disable this action */
  redirectMessage: string;
  /** If rule matches, reply to message and prepend with this text. Set to empty string to disable this action */
  replyText: string;
  /** If rule matches, run this compiled AppleScript file. Set to empty string to disable this action */
  runScript: string;
  /** Indicates whether all conditions must be met for rule to execute */
  allConditionsMustBeMet: boolean;
  /** If rule matches, copy to this mailbox */
  copyMessage: Mailbox;
  /** If rule matches, move to this mailbox */
  moveMessage: Mailbox;
  /** Indicates whether the color will be used to highlight the text or background of a message in the message list */
  highlightTextUsingColor: boolean;
  /** Indicates whether the rule is enabled */
  enabled: boolean;
  /** Name of rule */
  name: string;
  /** Indicates whether the rule has a copy action */
  shouldCopyMessage: boolean;
  /** Indicates whether the rule has a move action */
  shouldMoveMessage: boolean;
  /** If rule matches, stop rule evaluation for this message */
  stopEvaluatingRules: boolean;
}

/** Input for creating a Rule */
export interface RuleCreateInput {
  /** If rule matches, apply this color */
  colorMessage?: string;
  /** If rule matches, delete message */
  deleteMessage?: boolean;
  /** If rule matches, prepend this text to the forwarded message. Set to empty string to include no prepended text */
  forwardText?: string;
  /** If rule matches, forward message to this address, or multiple addresses, separated by commas. Set to empty string to disable this action */
  forwardMessage?: string;
  /** If rule matches, mark message as flagged */
  markFlagged?: boolean;
  /** If rule matches, mark message with the specified flag. Set to -1 to disable this action */
  markFlagIndex?: number;
  /** If rule matches, mark message as read */
  markRead?: boolean;
  /** If rule matches, play this sound (specify name of sound or path to sound) */
  playSound?: string;
  /** If rule matches, redirect message to this address or multiple addresses, separate by commas. Set to empty string to disable this action */
  redirectMessage?: string;
  /** If rule matches, reply to message and prepend with this text. Set to empty string to disable this action */
  replyText?: string;
  /** If rule matches, run this compiled AppleScript file. Set to empty string to disable this action */
  runScript?: string;
  /** Indicates whether all conditions must be met for rule to execute */
  allConditionsMustBeMet?: boolean;
  /** If rule matches, copy to this mailbox */
  copyMessage?: Mailbox;
  /** If rule matches, move to this mailbox */
  moveMessage?: Mailbox;
  /** Indicates whether the color will be used to highlight the text or background of a message in the message list */
  highlightTextUsingColor?: boolean;
  /** Indicates whether the rule is enabled */
  enabled?: boolean;
  /** Name of rule */
  name?: string;
  /** Indicates whether the rule has a copy action */
  shouldCopyMessage?: boolean;
  /** Indicates whether the rule has a move action */
  shouldMoveMessage?: boolean;
  /** If rule matches, stop rule evaluation for this message */
  stopEvaluatingRules?: boolean;
}

/** Input for updating a Rule */
export type RuleUpdateInput = Partial<RuleCreateInput>;

/** Class for conditions that can be attached to a single rule */
export interface RuleCondition {
  /** Rule expression field */
  expression: string;
  /** Rule header key */
  header: string;
  /** Rule qualifier */
  qualifier: string;
  /** Rule type */
  ruleType: string;
}

/** Input for creating a RuleCondition */
export interface RuleConditionCreateInput {
  /** Rule expression field */
  expression?: string;
  /** Rule header key */
  header?: string;
  /** Rule qualifier */
  qualifier?: string;
  /** Rule type */
  ruleType?: string;
}

/** Input for updating a RuleCondition */
export type RuleConditionUpdateInput = Partial<RuleConditionCreateInput>;

/** An email recipient */
export interface Recipient {
  /** The recipients email address */
  address: string;
  /** The name used for display */
  name: string;
}

/** Input for creating a Recipient */
export interface RecipientCreateInput {
  /** The recipients email address */
  address?: string;
  /** The name used for display */
  name?: string;
}

/** Input for updating a Recipient */
export type RecipientUpdateInput = Partial<RecipientCreateInput>;

/** An email recipient in the Bcc: field */
export interface BccRecipient {
  /** Unique identifier for this recipient */
  id: string;
}

/** Input for creating a BccRecipient */
export type BccRecipientCreateInput = Record<string, never>;

/** Input for updating a BccRecipient */
export type BccRecipientUpdateInput = Partial<BccRecipientCreateInput>;

/** An email recipient in the Cc: field */
export interface CcRecipient {
  /** Unique identifier for this recipient */
  id: string;
}

/** Input for creating a CcRecipient */
export type CcRecipientCreateInput = Record<string, never>;

/** Input for updating a CcRecipient */
export type CcRecipientUpdateInput = Partial<CcRecipientCreateInput>;

/** An email recipient in the To: field */
export interface ToRecipient {
  /** Unique identifier for this recipient */
  id: string;
}

/** Input for creating a ToRecipient */
export type ToRecipientCreateInput = Record<string, never>;

/** Input for updating a ToRecipient */
export type ToRecipientUpdateInput = Partial<ToRecipientCreateInput>;

/** A header value for a message. E.g. To, Subject, From. */
export interface Header {
  /** Contents of the header */
  content: string;
  /** Name of the header value */
  name: string;
}

/** Input for creating a Header */
export interface HeaderCreateInput {
  /** Contents of the header */
  content?: string;
  /** Name of the header value */
  name?: string;
}

/** Input for updating a Header */
export type HeaderUpdateInput = Partial<HeaderCreateInput>;

/** A file attached to a received message. */
export interface MailAttachment {
  /** Name of the attachment */
  name: string;
  /** MIME type of the attachment E.g. text/plain. */
  mIMEType: string;
  /** Approximate size in bytes. */
  fileSize: number;
  /** Indicates whether the attachment has been downloaded. */
  downloaded: boolean;
  /** The unique identifier of the attachment. */
  id: string;
}

/** Input for creating a MailAttachment */
export type MailAttachmentCreateInput = Record<string, never>;

/** Input for updating a MailAttachment */
export type MailAttachmentUpdateInput = Partial<MailAttachmentCreateInput>;

// Zod schemas for runtime validation

export const RichTextSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
});

export const AttachmentSchema = z.object({
  fileName: z.string(),
});

export const ParagraphSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
});

export const WordSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
});

export const CharacterSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
});

export const AttributeRunSchema = z.object({
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  font: z.string(),
  size: z.number(),
});

export const OutgoingMessageSchema = z.object({
  sender: z.string(),
  subject: z.string(),
  visible: z.boolean(),
  messageSignature: z.string(),
  id: z.number(),
  htmlContent: z.string(),
  vcardPath: z.string(),
});

export const MessageViewerSchema = z.object({
  draftsMailbox: z.string(),
  inbox: z.string(),
  junkMailbox: z.string(),
  outbox: z.string(),
  sentMailbox: z.string(),
  trashMailbox: z.string(),
  sortColumn: z.string(),
  sortedAscending: z.boolean(),
  mailboxListVisible: z.boolean(),
  previewPaneIsVisible: z.boolean(),
  visibleColumns: z.string(),
  id: z.number(),
  visibleMessages: z.string(),
  selectedMessages: z.string(),
  selectedMailboxes: z.string(),
});

export const MessageSchema = z.object({
  id: z.number(),
  allHeaders: z.string(),
  backgroundColor: z.string(),
  mailbox: z.string(),
  content: z.string(),
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
});

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
});

export const MailboxSchema = z.object({
  name: z.string(),
  unreadCount: z.number(),
  account: z.string(),
  container: z.string(),
});

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
  copyMessage: z.string(),
  moveMessage: z.string(),
  highlightTextUsingColor: z.boolean(),
  enabled: z.boolean(),
  name: z.string(),
  shouldCopyMessage: z.boolean(),
  shouldMoveMessage: z.boolean(),
  stopEvaluatingRules: z.boolean(),
});

export const RuleConditionSchema = z.object({
  expression: z.string(),
  header: z.string(),
  qualifier: z.string(),
  ruleType: z.string(),
});

export const RecipientSchema = z.object({
  address: z.string(),
  name: z.string(),
});

export const BccRecipientSchema = z.object({
  id: z.string(),
});

export const CcRecipientSchema = z.object({
  id: z.string(),
});

export const ToRecipientSchema = z.object({
  id: z.string(),
});

export const HeaderSchema = z.object({
  content: z.string(),
  name: z.string(),
});

export const MailAttachmentSchema = z.object({
  name: z.string(),
  mIMEType: z.string(),
  fileSize: z.number(),
  downloaded: z.boolean(),
  id: z.string(),
});
