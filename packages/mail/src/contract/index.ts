/**
 * The Mail contract: the transport-neutral description of every
 * Mail operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `MailClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `MailClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { mailContract } from '@macts/mail/contract'
 *
 * const client = createClient(mailContract, { token, url })
 * ```
 *
 * Generated from the Mail manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type FileSource,
  type FileValue,
  type Integer,
  type ObjectReferenceVariant,
  type OperationDescriptor,
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** SaveableFileFormat */
export type SaveableFileFormat = 'nativeFormat'

/** DefaultMessageFormat */
export type DefaultMessageFormat = 'plainFormat' | 'richFormat'

/** HeaderDetail */
export type HeaderDetail = 'all' | 'custom' | 'default' | 'noHeaders'

/** LdapScope */
export type LdapScope = 'base' | 'oneLevel' | 'subtree'

/** QuotingColor */
export type QuotingColor = 'blue' | 'green' | 'orange' | 'other' | 'purple' | 'red' | 'yellow'

/** ViewerColumns */
export type ViewerColumns =
  | 'attachmentsColumn'
  | 'messageColor'
  | 'dateReceivedColumn'
  | 'dateSentColumn'
  | 'flagsColumn'
  | 'fromColumn'
  | 'mailboxColumn'
  | 'messageStatusColumn'
  | 'numberColumn'
  | 'sizeColumn'
  | 'subjectColumn'
  | 'toColumn'
  | 'dateLastSavedColumn'

/** Authentication */
export type Authentication =
  | 'password'
  | 'apop'
  | 'kerberos5'
  | 'ntlm'
  | 'md5'
  | 'external'
  | 'appleToken'
  | 'none'

/** HighlightColors */
export type HighlightColors =
  | 'blue'
  | 'gray'
  | 'green'
  | 'none'
  | 'orange'
  | 'other'
  | 'purple'
  | 'red'
  | 'yellow'

/** MessageCachingPolicy */
export type MessageCachingPolicy =
  | 'doNotKeepCopiesOfAnyMessages'
  | 'onlyMessagesIHaveRead'
  | 'allMessagesButOmitAttachments'
  | 'allMessagesAndTheirAttachments'

/** RuleQualifier */
export type RuleQualifier =
  | 'beginsWithValue'
  | 'doesContainValue'
  | 'doesNotContainValue'
  | 'endsWithValue'
  | 'equalToValue'
  | 'lessThanValue'
  | 'greaterThanValue'
  | 'none'

/** RuleType */
export type RuleType =
  | 'account'
  | 'anyRecipient'
  | 'ccHeader'
  | 'matchesEveryMessage'
  | 'fromHeader'
  | 'headerKey'
  | 'messageContent'
  | 'messageIsJunkMail'
  | 'senderIsInMyContacts'
  | 'senderIsInMyPreviousRecipients'
  | 'senderIsMemberOfGroup'
  | 'senderIsNotInMyContacts'
  | 'senderIsNotInMyPreviousRecipients'
  | 'senderIsNotMemberOfGroup'
  | 'senderIsVIP'
  | 'subjectHeader'
  | 'toHeader'
  | 'toOrCcHeader'
  | 'attachmentType'

/** TypeOfAccount */
export type TypeOfAccount = 'pop' | 'smtp' | 'imap' | 'iCloud' | 'unknown'

/** Rich (styled) text */
export interface RichText {
  /** The color of the first character. */
  color: Rgb
  /** The name of the font of the first character. */
  font: string
  /** The size in points of the first character. */
  size: number
}

/** Represents an inline text attachment. This class is used mainly for make commands. */
export interface Attachment {
  /** The file for the attachment */
  fileName: FileValue
}

/** This subdivides the text into paragraphs. */
export interface Paragraph {
  /** The color of the first character. */
  color: Rgb
  /** The name of the font of the first character. */
  font: string
  /** The size in points of the first character. */
  size: number
}

/** This subdivides the text into words. */
export interface Word {
  /** The color of the first character. */
  color: Rgb
  /** The name of the font of the first character. */
  font: string
  /** The size in points of the first character. */
  size: number
}

/** This subdivides the text into characters. */
export interface Character {
  /** The color of the character. */
  color: Rgb
  /** The name of the font of the character. */
  font: string
  /** The size in points of the character. */
  size: number
}

/** This subdivides the text into chunks that all have the same attributes. */
export interface AttributeRun {
  /** The color of the first character. */
  color: Rgb
  /** The name of the font of the first character. */
  font: string
  /** The size in points of the first character. */
  size: number
}

/** A new email message */
export interface OutgoingMessage {
  /** The sender of the message */
  sender: string
  /** The subject of the message */
  subject: string
  /** Controls whether the message window is shown on the screen. The default is false */
  visible: boolean
  /** The signature of the message */
  messageSignature: string
  /** The unique identifier of the message */
  readonly id: Integer
  /** Does nothing at all (deprecated) */
  htmlContent: string
  /** Does nothing at all (deprecated) */
  vcardPath: FileValue
}

/** Represents the object responsible for managing a viewer window */
export interface MessageViewer {
  /** The top level Drafts mailbox */
  readonly draftsMailbox: ObjectReferenceVariant<Mailbox, never>
  /** The top level In mailbox */
  readonly inbox: ObjectReferenceVariant<Mailbox, never>
  /** The top level Junk mailbox */
  readonly junkMailbox: ObjectReferenceVariant<Mailbox, never>
  /** The top level Out mailbox */
  readonly outbox: ObjectReferenceVariant<Mailbox, never>
  /** The top level Sent mailbox */
  readonly sentMailbox: ObjectReferenceVariant<Mailbox, never>
  /** The top level Trash mailbox */
  readonly trashMailbox: ObjectReferenceVariant<Mailbox, never>
  /** The column that is currently sorted in the viewer */
  sortColumn: string
  /** Whether the viewer is sorted ascending or not */
  sortedAscending: boolean
  /** Controls whether the list of mailboxes is visible or not */
  mailboxListVisible: boolean
  /** Controls whether the preview pane of the message viewer window is visible or not */
  previewPaneIsVisible: boolean
  /**
   * List of columns that are visible. The subject column and the message status column will always
   * be visible
   */
  visibleColumns: string
  /** The unique identifier of the message viewer */
  readonly id: Integer
  /** List of messages currently being displayed in the viewer */
  visibleMessages: string
  /** List of messages currently selected */
  selectedMessages: string
  /** List of mailboxes currently selected in the list of mailboxes */
  selectedMailboxes: string
}

/** An email message */
export interface Message {
  /** The unique identifier of the message. */
  readonly id: Integer
  /** All the headers of the message */
  readonly allHeaders: string
  /** The background color of the message */
  backgroundColor: string
  /** The mailbox in which this message is filed */
  mailbox: ObjectReferenceVariant<Mailbox, never>
  /** Contents of an email message */
  readonly content: ObjectReferenceVariant<RichText, never>
  /** The date a message was received */
  readonly dateReceived: Date
  /** The date a message was sent */
  readonly dateSent: Date
  /** Indicates whether the message is deleted or not */
  deletedStatus: boolean
  /** Indicates whether the message is flagged or not */
  flaggedStatus: boolean
  /** The flag on the message, or -1 if the message is not flagged */
  flagIndex: Integer
  /**
   * Indicates whether the message has been marked junk or evaluated to be junk by the junk mail
   * filter.
   */
  junkMailStatus: boolean
  /** Indicates whether the message is read or not */
  readStatus: boolean
  /** The unique message ID string */
  readonly messageId: string
  /** Raw source of the message */
  readonly source: string
  /** The address that replies should be sent to */
  readonly replyTo: string
  /** The size (in bytes) of a message */
  readonly messageSize: Integer
  /** The sender of the message */
  readonly sender: string
  /** The subject of the message */
  readonly subject: string
  /** Indicates whether the message was forwarded or not */
  readonly wasForwarded: boolean
  /** Indicates whether the message was redirected or not */
  readonly wasRedirected: boolean
  /** Indicates whether the message was replied to or not */
  readonly wasRepliedTo: boolean
}

/**
 * A Mail account for receiving messages (POP/IMAP). To create a new receiving account, use the 'pop
 * account', 'imap account', and 'iCloud account' objects
 */
export interface Account {
  /** The delivery account used when sending mail from this account */
  deliveryAccount: string
  /** The name of an account */
  name: string
  /** The unique identifier of the account */
  readonly id: string
  /** Password for this account. Can be set, but not read via scripting */
  password: string
  /** Preferred authentication scheme for account */
  authentication: string
  /** The type of an account */
  readonly accountType: string
  /** The list of email addresses configured for an account */
  emailAddresses: string
  /** The users full name configured for an account */
  fullName: string
  /** Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete) */
  emptyJunkMessagesFrequency: Integer
  /** Does nothing at all (deprecated) */
  emptySentMessagesFrequency: Integer
  /**
   * Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 =
   * never delete)
   */
  emptyTrashFrequency: Integer
  /** Indicates whether the messages in the junk messages mailboxes will be deleted on quit */
  emptyJunkMessagesOnQuit: boolean
  /** Does nothing at all (deprecated) */
  emptySentMessagesOnQuit: boolean
  /**
   * Indicates whether the messages in deleted messages mailboxes will be permanently deleted on
   * quit
   */
  emptyTrashOnQuit: boolean
  /** Indicates whether the account is enabled or not */
  enabled: boolean
  /** The user name used to connect to an account */
  userName: string
  /** The directory where the account stores things on disk */
  readonly accountDirectory: FileValue
  /** The port used to connect to an account */
  port: Integer
  /** The host name used to connect to an account */
  serverName: string
  /** Does nothing at all (deprecated) */
  includeWhenGettingNewMail: boolean
  /** Indicates whether messages that are deleted will be moved to the trash mailbox */
  moveDeletedMessagesToTrash: boolean
  /** Indicates whether SSL is enabled for this receiving account */
  usesSsl: boolean
}

/** A mailbox that holds messages */
export interface Mailbox {
  /** The name of a mailbox */
  name: string
  /** The number of unread messages in the mailbox */
  readonly unreadCount: Integer
  /** The account property */
  readonly account: ObjectReferenceVariant<Account, string>
  /** The container property */
  readonly container: ObjectReferenceVariant<Mailbox, never>
}

/** Class for message rules */
export interface Rule {
  /** If rule matches, apply this color */
  colorMessage: string
  /** If rule matches, delete message */
  deleteMessage: boolean
  /**
   * If rule matches, prepend this text to the forwarded message. Set to empty string to include no
   * prepended text
   */
  forwardText: string
  /**
   * If rule matches, forward message to this address, or multiple addresses, separated by commas.
   * Set to empty string to disable this action
   */
  forwardMessage: string
  /** If rule matches, mark message as flagged */
  markFlagged: boolean
  /** If rule matches, mark message with the specified flag. Set to -1 to disable this action */
  markFlagIndex: Integer
  /** If rule matches, mark message as read */
  markRead: boolean
  /** If rule matches, play this sound (specify name of sound or path to sound) */
  playSound: string
  /**
   * If rule matches, redirect message to this address or multiple addresses, separate by commas.
   * Set to empty string to disable this action
   */
  redirectMessage: string
  /**
   * If rule matches, reply to message and prepend with this text. Set to empty string to disable
   * this action
   */
  replyText: string
  /**
   * If rule matches, run this compiled AppleScript file. Set to empty string to disable this action
   */
  runScript: string
  /** Indicates whether all conditions must be met for rule to execute */
  allConditionsMustBeMet: boolean
  /** If rule matches, copy to this mailbox */
  copyMessage: ObjectReferenceVariant<Mailbox, never>
  /** If rule matches, move to this mailbox */
  moveMessage: ObjectReferenceVariant<Mailbox, never>
  /**
   * Indicates whether the color will be used to highlight the text or background of a message in
   * the message list
   */
  highlightTextUsingColor: boolean
  /** Indicates whether the rule is enabled */
  enabled: boolean
  /** Name of rule */
  name: string
  /** Indicates whether the rule has a copy action */
  shouldCopyMessage: boolean
  /** Indicates whether the rule has a move action */
  shouldMoveMessage: boolean
  /** If rule matches, stop rule evaluation for this message */
  stopEvaluatingRules: boolean
}

/** Class for conditions that can be attached to a single rule */
export interface RuleCondition {
  /** Rule expression field */
  expression: string
  /** Rule header key */
  header: string
  /** Rule qualifier */
  qualifier: string
  /** Rule type */
  ruleType: string
}

/** An email recipient */
export interface Recipient {
  /** The recipients email address */
  address: string
  /** The name used for display */
  name: string
}

/** An email recipient in the Bcc: field */
export interface BccRecipient {
  /** Unique identifier for this recipient */
  readonly id: string
}

/** An email recipient in the Cc: field */
export interface CcRecipient {
  /** Unique identifier for this recipient */
  readonly id: string
}

/** An email recipient in the To: field */
export interface ToRecipient {
  /** Unique identifier for this recipient */
  readonly id: string
}

/** A header value for a message. E.g. To, Subject, From. */
export interface Header {
  /** Contents of the header */
  content: string
  /** Name of the header value */
  name: string
}

/** A file attached to a received message. */
export interface MailAttachment {
  /** Name of the attachment */
  readonly name: string
  /** MIME type of the attachment E.g. text/plain. */
  readonly mIMEType: string
  /** Approximate size in bytes. */
  readonly fileSize: Integer
  /** Indicates whether the attachment has been downloaded. */
  readonly downloaded: boolean
  /** The unique identifier of the attachment. */
  readonly id: string
}

/** Input for creating a RichText. */
export interface RichTextCreateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for updating a RichText. Omitted fields are left unchanged. */
export interface RichTextUpdateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for creating an Attachment. */
export interface AttachmentCreateInput {
  /** The file for the attachment */
  fileName?: FileSource
}

/** Input for updating an Attachment. Omitted fields are left unchanged. */
export interface AttachmentUpdateInput {
  /** The file for the attachment */
  fileName?: FileSource
}

/** Input for creating a Paragraph. */
export interface ParagraphCreateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for updating a Paragraph. Omitted fields are left unchanged. */
export interface ParagraphUpdateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for creating a Word. */
export interface WordCreateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for updating a Word. Omitted fields are left unchanged. */
export interface WordUpdateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for creating a Character. */
export interface CharacterCreateInput {
  /** The color of the character. */
  color?: Rgb
  /** The name of the font of the character. */
  font?: string
  /** The size in points of the character. */
  size?: number
}

/** Input for updating a Character. Omitted fields are left unchanged. */
export interface CharacterUpdateInput {
  /** The color of the character. */
  color?: Rgb
  /** The name of the font of the character. */
  font?: string
  /** The size in points of the character. */
  size?: number
}

/** Input for creating an AttributeRun. */
export interface AttributeRunCreateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for updating an AttributeRun. Omitted fields are left unchanged. */
export interface AttributeRunUpdateInput {
  /** The color of the first character. */
  color?: Rgb
  /** The name of the font of the first character. */
  font?: string
  /** The size in points of the first character. */
  size?: number
}

/** Input for creating an OutgoingMessage. */
export interface OutgoingMessageCreateInput {
  /** The sender of the message */
  sender?: string
  /** The subject of the message */
  subject?: string
  /** Controls whether the message window is shown on the screen. The default is false */
  visible?: boolean
  /** The signature of the message */
  messageSignature?: string
  /** Does nothing at all (deprecated) */
  htmlContent?: string
  /** Does nothing at all (deprecated) */
  vcardPath?: FileSource
}

/** Input for updating an OutgoingMessage. Omitted fields are left unchanged. */
export interface OutgoingMessageUpdateInput {
  /** The sender of the message */
  sender?: string
  /** The subject of the message */
  subject?: string
  /** Controls whether the message window is shown on the screen. The default is false */
  visible?: boolean
  /** The signature of the message */
  messageSignature?: string
  /** Does nothing at all (deprecated) */
  htmlContent?: string
  /** Does nothing at all (deprecated) */
  vcardPath?: FileSource
}

/** Input for creating a MessageViewer. */
export interface MessageViewerCreateInput {
  /** The column that is currently sorted in the viewer */
  sortColumn?: string
  /** Whether the viewer is sorted ascending or not */
  sortedAscending?: boolean
  /** Controls whether the list of mailboxes is visible or not */
  mailboxListVisible?: boolean
  /** Controls whether the preview pane of the message viewer window is visible or not */
  previewPaneIsVisible?: boolean
  /**
   * List of columns that are visible. The subject column and the message status column will always
   * be visible
   */
  visibleColumns?: string
  /** List of messages currently being displayed in the viewer */
  visibleMessages?: string
  /** List of messages currently selected */
  selectedMessages?: string
  /** List of mailboxes currently selected in the list of mailboxes */
  selectedMailboxes?: string
}

/** Input for updating a MessageViewer. Omitted fields are left unchanged. */
export interface MessageViewerUpdateInput {
  /** The column that is currently sorted in the viewer */
  sortColumn?: string
  /** Whether the viewer is sorted ascending or not */
  sortedAscending?: boolean
  /** Controls whether the list of mailboxes is visible or not */
  mailboxListVisible?: boolean
  /** Controls whether the preview pane of the message viewer window is visible or not */
  previewPaneIsVisible?: boolean
  /**
   * List of columns that are visible. The subject column and the message status column will always
   * be visible
   */
  visibleColumns?: string
  /** List of messages currently being displayed in the viewer */
  visibleMessages?: string
  /** List of messages currently selected */
  selectedMessages?: string
  /** List of mailboxes currently selected in the list of mailboxes */
  selectedMailboxes?: string
}

/** Input for creating a Message. */
export interface MessageCreateInput {
  /** The background color of the message */
  backgroundColor?: string
  /** The mailbox in which this message is filed */
  mailbox?: ObjectReferenceVariant<Mailbox, never>
  /** Indicates whether the message is deleted or not */
  deletedStatus?: boolean
  /** Indicates whether the message is flagged or not */
  flaggedStatus?: boolean
  /** The flag on the message, or -1 if the message is not flagged */
  flagIndex?: Integer
  /**
   * Indicates whether the message has been marked junk or evaluated to be junk by the junk mail
   * filter.
   */
  junkMailStatus?: boolean
  /** Indicates whether the message is read or not */
  readStatus?: boolean
}

/** Input for updating a Message. Omitted fields are left unchanged. */
export interface MessageUpdateInput {
  /** The background color of the message */
  backgroundColor?: string
  /** The mailbox in which this message is filed */
  mailbox?: ObjectReferenceVariant<Mailbox, never>
  /** Indicates whether the message is deleted or not */
  deletedStatus?: boolean
  /** Indicates whether the message is flagged or not */
  flaggedStatus?: boolean
  /** The flag on the message, or -1 if the message is not flagged */
  flagIndex?: Integer
  /**
   * Indicates whether the message has been marked junk or evaluated to be junk by the junk mail
   * filter.
   */
  junkMailStatus?: boolean
  /** Indicates whether the message is read or not */
  readStatus?: boolean
}

/** Input for creating an Account. */
export interface AccountCreateInput {
  /** The delivery account used when sending mail from this account */
  deliveryAccount?: string
  /** The name of an account */
  name?: string
  /** Password for this account. Can be set, but not read via scripting */
  password?: string
  /** Preferred authentication scheme for account */
  authentication?: string
  /** The list of email addresses configured for an account */
  emailAddresses?: string
  /** The users full name configured for an account */
  fullName?: string
  /** Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete) */
  emptyJunkMessagesFrequency?: Integer
  /** Does nothing at all (deprecated) */
  emptySentMessagesFrequency?: Integer
  /**
   * Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 =
   * never delete)
   */
  emptyTrashFrequency?: Integer
  /** Indicates whether the messages in the junk messages mailboxes will be deleted on quit */
  emptyJunkMessagesOnQuit?: boolean
  /** Does nothing at all (deprecated) */
  emptySentMessagesOnQuit?: boolean
  /**
   * Indicates whether the messages in deleted messages mailboxes will be permanently deleted on
   * quit
   */
  emptyTrashOnQuit?: boolean
  /** Indicates whether the account is enabled or not */
  enabled?: boolean
  /** The user name used to connect to an account */
  userName?: string
  /** The port used to connect to an account */
  port?: Integer
  /** The host name used to connect to an account */
  serverName?: string
  /** Does nothing at all (deprecated) */
  includeWhenGettingNewMail?: boolean
  /** Indicates whether messages that are deleted will be moved to the trash mailbox */
  moveDeletedMessagesToTrash?: boolean
  /** Indicates whether SSL is enabled for this receiving account */
  usesSsl?: boolean
}

/** Input for updating an Account. Omitted fields are left unchanged. */
export interface AccountUpdateInput {
  /** The delivery account used when sending mail from this account */
  deliveryAccount?: string
  /** The name of an account */
  name?: string
  /** Password for this account. Can be set, but not read via scripting */
  password?: string
  /** Preferred authentication scheme for account */
  authentication?: string
  /** The list of email addresses configured for an account */
  emailAddresses?: string
  /** The users full name configured for an account */
  fullName?: string
  /** Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete) */
  emptyJunkMessagesFrequency?: Integer
  /** Does nothing at all (deprecated) */
  emptySentMessagesFrequency?: Integer
  /**
   * Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 =
   * never delete)
   */
  emptyTrashFrequency?: Integer
  /** Indicates whether the messages in the junk messages mailboxes will be deleted on quit */
  emptyJunkMessagesOnQuit?: boolean
  /** Does nothing at all (deprecated) */
  emptySentMessagesOnQuit?: boolean
  /**
   * Indicates whether the messages in deleted messages mailboxes will be permanently deleted on
   * quit
   */
  emptyTrashOnQuit?: boolean
  /** Indicates whether the account is enabled or not */
  enabled?: boolean
  /** The user name used to connect to an account */
  userName?: string
  /** The port used to connect to an account */
  port?: Integer
  /** The host name used to connect to an account */
  serverName?: string
  /** Does nothing at all (deprecated) */
  includeWhenGettingNewMail?: boolean
  /** Indicates whether messages that are deleted will be moved to the trash mailbox */
  moveDeletedMessagesToTrash?: boolean
  /** Indicates whether SSL is enabled for this receiving account */
  usesSsl?: boolean
}

/** Input for creating a Mailbox. */
export interface MailboxCreateInput {
  /** The name of a mailbox */
  name?: string
}

/** Input for updating a Mailbox. Omitted fields are left unchanged. */
export interface MailboxUpdateInput {
  /** The name of a mailbox */
  name?: string
}

/** Input for creating a Rule. */
export interface RuleCreateInput {
  /** If rule matches, apply this color */
  colorMessage?: string
  /** If rule matches, delete message */
  deleteMessage?: boolean
  /**
   * If rule matches, prepend this text to the forwarded message. Set to empty string to include no
   * prepended text
   */
  forwardText?: string
  /**
   * If rule matches, forward message to this address, or multiple addresses, separated by commas.
   * Set to empty string to disable this action
   */
  forwardMessage?: string
  /** If rule matches, mark message as flagged */
  markFlagged?: boolean
  /** If rule matches, mark message with the specified flag. Set to -1 to disable this action */
  markFlagIndex?: Integer
  /** If rule matches, mark message as read */
  markRead?: boolean
  /** If rule matches, play this sound (specify name of sound or path to sound) */
  playSound?: string
  /**
   * If rule matches, redirect message to this address or multiple addresses, separate by commas.
   * Set to empty string to disable this action
   */
  redirectMessage?: string
  /**
   * If rule matches, reply to message and prepend with this text. Set to empty string to disable
   * this action
   */
  replyText?: string
  /**
   * If rule matches, run this compiled AppleScript file. Set to empty string to disable this action
   */
  runScript?: string
  /** Indicates whether all conditions must be met for rule to execute */
  allConditionsMustBeMet?: boolean
  /** If rule matches, copy to this mailbox */
  copyMessage?: ObjectReferenceVariant<Mailbox, never>
  /** If rule matches, move to this mailbox */
  moveMessage?: ObjectReferenceVariant<Mailbox, never>
  /**
   * Indicates whether the color will be used to highlight the text or background of a message in
   * the message list
   */
  highlightTextUsingColor?: boolean
  /** Indicates whether the rule is enabled */
  enabled?: boolean
  /** Name of rule */
  name?: string
  /** Indicates whether the rule has a copy action */
  shouldCopyMessage?: boolean
  /** Indicates whether the rule has a move action */
  shouldMoveMessage?: boolean
  /** If rule matches, stop rule evaluation for this message */
  stopEvaluatingRules?: boolean
}

/** Input for updating a Rule. Omitted fields are left unchanged. */
export interface RuleUpdateInput {
  /** If rule matches, apply this color */
  colorMessage?: string
  /** If rule matches, delete message */
  deleteMessage?: boolean
  /**
   * If rule matches, prepend this text to the forwarded message. Set to empty string to include no
   * prepended text
   */
  forwardText?: string
  /**
   * If rule matches, forward message to this address, or multiple addresses, separated by commas.
   * Set to empty string to disable this action
   */
  forwardMessage?: string
  /** If rule matches, mark message as flagged */
  markFlagged?: boolean
  /** If rule matches, mark message with the specified flag. Set to -1 to disable this action */
  markFlagIndex?: Integer
  /** If rule matches, mark message as read */
  markRead?: boolean
  /** If rule matches, play this sound (specify name of sound or path to sound) */
  playSound?: string
  /**
   * If rule matches, redirect message to this address or multiple addresses, separate by commas.
   * Set to empty string to disable this action
   */
  redirectMessage?: string
  /**
   * If rule matches, reply to message and prepend with this text. Set to empty string to disable
   * this action
   */
  replyText?: string
  /**
   * If rule matches, run this compiled AppleScript file. Set to empty string to disable this action
   */
  runScript?: string
  /** Indicates whether all conditions must be met for rule to execute */
  allConditionsMustBeMet?: boolean
  /** If rule matches, copy to this mailbox */
  copyMessage?: ObjectReferenceVariant<Mailbox, never>
  /** If rule matches, move to this mailbox */
  moveMessage?: ObjectReferenceVariant<Mailbox, never>
  /**
   * Indicates whether the color will be used to highlight the text or background of a message in
   * the message list
   */
  highlightTextUsingColor?: boolean
  /** Indicates whether the rule is enabled */
  enabled?: boolean
  /** Name of rule */
  name?: string
  /** Indicates whether the rule has a copy action */
  shouldCopyMessage?: boolean
  /** Indicates whether the rule has a move action */
  shouldMoveMessage?: boolean
  /** If rule matches, stop rule evaluation for this message */
  stopEvaluatingRules?: boolean
}

/** Input for creating a RuleCondition. */
export interface RuleConditionCreateInput {
  /** Rule expression field */
  expression?: string
  /** Rule header key */
  header?: string
  /** Rule qualifier */
  qualifier?: string
  /** Rule type */
  ruleType?: string
}

/** Input for updating a RuleCondition. Omitted fields are left unchanged. */
export interface RuleConditionUpdateInput {
  /** Rule expression field */
  expression?: string
  /** Rule header key */
  header?: string
  /** Rule qualifier */
  qualifier?: string
  /** Rule type */
  ruleType?: string
}

/** Input for creating a Recipient. */
export interface RecipientCreateInput {
  /** The recipients email address */
  address?: string
  /** The name used for display */
  name?: string
}

/** Input for updating a Recipient. Omitted fields are left unchanged. */
export interface RecipientUpdateInput {
  /** The recipients email address */
  address?: string
  /** The name used for display */
  name?: string
}

/** Input for creating a BccRecipient. */
export type BccRecipientCreateInput = Record<string, never>

/** Input for updating a BccRecipient. Omitted fields are left unchanged. */
export type BccRecipientUpdateInput = Record<string, never>

/** Input for creating a CcRecipient. */
export type CcRecipientCreateInput = Record<string, never>

/** Input for updating a CcRecipient. Omitted fields are left unchanged. */
export type CcRecipientUpdateInput = Record<string, never>

/** Input for creating a ToRecipient. */
export type ToRecipientCreateInput = Record<string, never>

/** Input for updating a ToRecipient. Omitted fields are left unchanged. */
export type ToRecipientUpdateInput = Record<string, never>

/** Input for creating a Header. */
export interface HeaderCreateInput {
  /** Contents of the header */
  content?: string
  /** Name of the header value */
  name?: string
}

/** Input for updating a Header. Omitted fields are left unchanged. */
export interface HeaderUpdateInput {
  /** Contents of the header */
  content?: string
  /** Name of the header value */
  name?: string
}

/** Input for creating a MailAttachment. */
export type MailAttachmentCreateInput = Record<string, never>

/** Input for updating a MailAttachment. Omitted fields are left unchanged. */
export type MailAttachmentUpdateInput = Record<string, never>

/** A new email message */
export interface OutgoingMessageResourceClient {
  /** Sends a message. */
  send(options?: CallOptions): Promise<void>
}

/** An email message */
export interface MessageResourceClient {
  /** Does nothing at all (deprecated) */
  bounce(options?: CallOptions): Promise<void>
  /** Creates a forwarded message. */
  forward(openingWindow?: boolean, options?: CallOptions): Promise<void>
  /** Creates a redirected message. */
  redirect(openingWindow?: boolean, options?: CallOptions): Promise<void>
  /** Creates a reply message. */
  reply(openingWindow?: boolean, replyToAll?: boolean, options?: CallOptions): Promise<void>
}

/**
 * The Mail client: one namespace per resource that has operations, plus the app's own commands. A
 * client factory creates one from {@link mailContract}.
 */
export interface MailClient {
  /** A new email message */
  readonly outgoingmessages: OutgoingMessageResourceClient
  /** An email message */
  readonly messages: MessageResourceClient
  /** Delete an object. */
  _delete(options?: CallOptions): Promise<void>
  /** Copy an object. */
  duplicate(to?: string, withProperties?: unknown, options?: CallOptions): Promise<void>
  /** Move an object to a new location. */
  move(to: string, options?: CallOptions): Promise<void>
  /** Triggers a check for email. */
  checkForNewMail(
    _for?: ObjectReferenceVariant<Account, string>,
    options?: CallOptions
  ): Promise<void>
  /**
   * Command to get the full name out of a fully specified email address. E.g. Calling this with
   * "John Doe <jdoe@example.com>" as the direct object would return "John Doe"
   */
  extractNameFrom(options?: CallOptions): Promise<void>
  /**
   * Command to get just the email address of a fully specified email address. E.g. Calling this
   * with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"
   */
  extractAddressFrom(options?: CallOptions): Promise<void>
  /** Opens a mailto URL. */
  getURL(options?: CallOptions): Promise<void>
  /** Imports a mailbox created by Mail. */
  importMailMailbox(at: FileSource, options?: CallOptions): Promise<void>
  /** Opens a mailto URL. */
  mailto(options?: CallOptions): Promise<void>
  /**
   * Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of
   * this handler is a list of messages being acted upon.
   */
  performMailActionWithMessages(
    inMailboxes?: ObjectReferenceVariant<Mailbox, never>,
    forRule?: ObjectReferenceVariant<Rule, never>,
    options?: CallOptions
  ): Promise<void>
  /** Command to trigger synchronizing of an IMAP account with the server. */
  synchronize(_with: ObjectReferenceVariant<Account, string>, options?: CallOptions): Promise<void>
}

const richTextRecordType: ValueType<RichText> = t.record(
  {
    color: t.rgb({ description: 'The color of the first character.' }),
    font: t.string({ description: 'The name of the font of the first character.' }),
    size: t.double({ description: 'The size in points of the first character.' }),
  },
  { description: 'Rich (styled) text' }
)

const attachmentRecordType: ValueType<Attachment> = t.record(
  {
    fileName: t.file({ description: 'The file for the attachment' }),
  },
  {
    description:
      'Represents an inline text attachment. This class is used mainly for make commands.',
  }
)

const paragraphRecordType: ValueType<Paragraph> = t.record(
  {
    color: t.rgb({ description: 'The color of the first character.' }),
    font: t.string({ description: 'The name of the font of the first character.' }),
    size: t.double({ description: 'The size in points of the first character.' }),
  },
  { description: 'This subdivides the text into paragraphs.' }
)

const wordRecordType: ValueType<Word> = t.record(
  {
    color: t.rgb({ description: 'The color of the first character.' }),
    font: t.string({ description: 'The name of the font of the first character.' }),
    size: t.double({ description: 'The size in points of the first character.' }),
  },
  { description: 'This subdivides the text into words.' }
)

const characterRecordType: ValueType<Character> = t.record(
  {
    color: t.rgb({ description: 'The color of the character.' }),
    font: t.string({ description: 'The name of the font of the character.' }),
    size: t.double({ description: 'The size in points of the character.' }),
  },
  { description: 'This subdivides the text into characters.' }
)

const attributeRunRecordType: ValueType<AttributeRun> = t.record(
  {
    color: t.rgb({ description: 'The color of the first character.' }),
    font: t.string({ description: 'The name of the font of the first character.' }),
    size: t.double({ description: 'The size in points of the first character.' }),
  },
  { description: 'This subdivides the text into chunks that all have the same attributes.' }
)

const outgoingMessageRecordType: ValueType<OutgoingMessage> = t.record(
  {
    sender: t.string({ description: 'The sender of the message' }),
    subject: t.string({ description: 'The subject of the message' }),
    visible: t.boolean({
      description:
        'Controls whether the message window is shown on the screen. The default is false',
    }),
    messageSignature: t.string({ description: 'The signature of the message' }),
    id: t.integer({ description: 'The unique identifier of the message' }),
    htmlContent: t.string({ description: 'Does nothing at all (deprecated)' }),
    vcardPath: t.file({ description: 'Does nothing at all (deprecated)' }),
  },
  { description: 'A new email message' }
)

const messageViewerRecordType: ValueType<MessageViewer> = t.record(
  {
    draftsMailbox: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The top level Drafts mailbox',
    }),
    inbox: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The top level In mailbox',
    }),
    junkMailbox: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The top level Junk mailbox',
    }),
    outbox: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The top level Out mailbox',
    }),
    sentMailbox: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The top level Sent mailbox',
    }),
    trashMailbox: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The top level Trash mailbox',
    }),
    sortColumn: t.string({ description: 'The column that is currently sorted in the viewer' }),
    sortedAscending: t.boolean({ description: 'Whether the viewer is sorted ascending or not' }),
    mailboxListVisible: t.boolean({
      description: 'Controls whether the list of mailboxes is visible or not',
    }),
    previewPaneIsVisible: t.boolean({
      description:
        'Controls whether the preview pane of the message viewer window is visible or not',
    }),
    visibleColumns: t.string({
      description:
        'List of columns that are visible. The subject column and the message status column will always be visible',
    }),
    id: t.integer({ description: 'The unique identifier of the message viewer' }),
    visibleMessages: t.string({
      description: 'List of messages currently being displayed in the viewer',
    }),
    selectedMessages: t.string({ description: 'List of messages currently selected' }),
    selectedMailboxes: t.string({
      description: 'List of mailboxes currently selected in the list of mailboxes',
    }),
  },
  { description: 'Represents the object responsible for managing a viewer window' }
)

const messageRecordType: ValueType<Message> = t.record(
  {
    id: t.integer({ description: 'The unique identifier of the message.' }),
    allHeaders: t.string({ description: 'All the headers of the message' }),
    backgroundColor: t.string({ description: 'The background color of the message' }),
    mailbox: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The mailbox in which this message is filed',
    }),
    content: t.reference<RichText, never>(() => resources, 'RichText', 'one', {
      description: 'Contents of an email message',
    }),
    dateReceived: t.date({ description: 'The date a message was received' }),
    dateSent: t.date({ description: 'The date a message was sent' }),
    deletedStatus: t.boolean({ description: 'Indicates whether the message is deleted or not' }),
    flaggedStatus: t.boolean({ description: 'Indicates whether the message is flagged or not' }),
    flagIndex: t.integer({
      description: 'The flag on the message, or -1 if the message is not flagged',
    }),
    junkMailStatus: t.boolean({
      description:
        'Indicates whether the message has been marked junk or evaluated to be junk by the junk mail filter.',
    }),
    readStatus: t.boolean({ description: 'Indicates whether the message is read or not' }),
    messageId: t.string({ description: 'The unique message ID string' }),
    source: t.string({ description: 'Raw source of the message' }),
    replyTo: t.string({ description: 'The address that replies should be sent to' }),
    messageSize: t.integer({ description: 'The size (in bytes) of a message' }),
    sender: t.string({ description: 'The sender of the message' }),
    subject: t.string({ description: 'The subject of the message' }),
    wasForwarded: t.boolean({ description: 'Indicates whether the message was forwarded or not' }),
    wasRedirected: t.boolean({
      description: 'Indicates whether the message was redirected or not',
    }),
    wasRepliedTo: t.boolean({ description: 'Indicates whether the message was replied to or not' }),
  },
  { description: 'An email message' }
)

const accountRecordType: ValueType<Account> = t.record(
  {
    deliveryAccount: t.string({
      description: 'The delivery account used when sending mail from this account',
    }),
    name: t.string({ description: 'The name of an account' }),
    id: t.string({ description: 'The unique identifier of the account' }),
    password: t.string({
      description: 'Password for this account. Can be set, but not read via scripting',
    }),
    authentication: t.string({ description: 'Preferred authentication scheme for account' }),
    accountType: t.string({ description: 'The type of an account' }),
    emailAddresses: t.string({
      description: 'The list of email addresses configured for an account',
    }),
    fullName: t.string({ description: 'The users full name configured for an account' }),
    emptyJunkMessagesFrequency: t.integer({
      description:
        'Number of days before junk messages are deleted (0 = delete on quit, -1 = never delete)',
    }),
    emptySentMessagesFrequency: t.integer({ description: 'Does nothing at all (deprecated)' }),
    emptyTrashFrequency: t.integer({
      description:
        'Number of days before messages in the trash are permanently deleted (0 = delete on quit, -1 = never delete)',
    }),
    emptyJunkMessagesOnQuit: t.boolean({
      description:
        'Indicates whether the messages in the junk messages mailboxes will be deleted on quit',
    }),
    emptySentMessagesOnQuit: t.boolean({ description: 'Does nothing at all (deprecated)' }),
    emptyTrashOnQuit: t.boolean({
      description:
        'Indicates whether the messages in deleted messages mailboxes will be permanently deleted on quit',
    }),
    enabled: t.boolean({ description: 'Indicates whether the account is enabled or not' }),
    userName: t.string({ description: 'The user name used to connect to an account' }),
    accountDirectory: t.file({
      description: 'The directory where the account stores things on disk',
    }),
    port: t.integer({ description: 'The port used to connect to an account' }),
    serverName: t.string({ description: 'The host name used to connect to an account' }),
    includeWhenGettingNewMail: t.boolean({ description: 'Does nothing at all (deprecated)' }),
    moveDeletedMessagesToTrash: t.boolean({
      description: 'Indicates whether messages that are deleted will be moved to the trash mailbox',
    }),
    usesSsl: t.boolean({
      description: 'Indicates whether SSL is enabled for this receiving account',
    }),
  },
  {
    description:
      "A Mail account for receiving messages (POP/IMAP). To create a new receiving account, use the 'pop account', 'imap account', and 'iCloud account' objects",
  }
)

const mailboxRecordType: ValueType<Mailbox> = t.record(
  {
    name: t.string({ description: 'The name of a mailbox' }),
    unreadCount: t.integer({ description: 'The number of unread messages in the mailbox' }),
    account: t.reference<Account, string>(() => resources, 'Account', 'one', {
      description: 'The account property',
    }),
    container: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'The container property',
    }),
  },
  { description: 'A mailbox that holds messages' }
)

const ruleRecordType: ValueType<Rule> = t.record(
  {
    colorMessage: t.string({ description: 'If rule matches, apply this color' }),
    deleteMessage: t.boolean({ description: 'If rule matches, delete message' }),
    forwardText: t.string({
      description:
        'If rule matches, prepend this text to the forwarded message. Set to empty string to include no prepended text',
    }),
    forwardMessage: t.string({
      description:
        'If rule matches, forward message to this address, or multiple addresses, separated by commas. Set to empty string to disable this action',
    }),
    markFlagged: t.boolean({ description: 'If rule matches, mark message as flagged' }),
    markFlagIndex: t.integer({
      description:
        'If rule matches, mark message with the specified flag. Set to -1 to disable this action',
    }),
    markRead: t.boolean({ description: 'If rule matches, mark message as read' }),
    playSound: t.string({
      description: 'If rule matches, play this sound (specify name of sound or path to sound)',
    }),
    redirectMessage: t.string({
      description:
        'If rule matches, redirect message to this address or multiple addresses, separate by commas. Set to empty string to disable this action',
    }),
    replyText: t.string({
      description:
        'If rule matches, reply to message and prepend with this text. Set to empty string to disable this action',
    }),
    runScript: t.string({
      description:
        'If rule matches, run this compiled AppleScript file. Set to empty string to disable this action',
    }),
    allConditionsMustBeMet: t.boolean({
      description: 'Indicates whether all conditions must be met for rule to execute',
    }),
    copyMessage: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'If rule matches, copy to this mailbox',
    }),
    moveMessage: t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
      description: 'If rule matches, move to this mailbox',
    }),
    highlightTextUsingColor: t.boolean({
      description:
        'Indicates whether the color will be used to highlight the text or background of a message in the message list',
    }),
    enabled: t.boolean({ description: 'Indicates whether the rule is enabled' }),
    name: t.string({ description: 'Name of rule' }),
    shouldCopyMessage: t.boolean({ description: 'Indicates whether the rule has a copy action' }),
    shouldMoveMessage: t.boolean({ description: 'Indicates whether the rule has a move action' }),
    stopEvaluatingRules: t.boolean({
      description: 'If rule matches, stop rule evaluation for this message',
    }),
  },
  { description: 'Class for message rules' }
)

const ruleConditionRecordType: ValueType<RuleCondition> = t.record(
  {
    expression: t.string({ description: 'Rule expression field' }),
    header: t.string({ description: 'Rule header key' }),
    qualifier: t.string({ description: 'Rule qualifier' }),
    ruleType: t.string({ description: 'Rule type' }),
  },
  { description: 'Class for conditions that can be attached to a single rule' }
)

const recipientRecordType: ValueType<Recipient> = t.record(
  {
    address: t.string({ description: 'The recipients email address' }),
    name: t.string({ description: 'The name used for display' }),
  },
  { description: 'An email recipient' }
)

const bccRecipientRecordType: ValueType<BccRecipient> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this recipient' }),
  },
  { description: 'An email recipient in the Bcc: field' }
)

const ccRecipientRecordType: ValueType<CcRecipient> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this recipient' }),
  },
  { description: 'An email recipient in the Cc: field' }
)

const toRecipientRecordType: ValueType<ToRecipient> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this recipient' }),
  },
  { description: 'An email recipient in the To: field' }
)

const headerRecordType: ValueType<Header> = t.record(
  {
    content: t.string({ description: 'Contents of the header' }),
    name: t.string({ description: 'Name of the header value' }),
  },
  { description: 'A header value for a message. E.g. To, Subject, From.' }
)

const mailAttachmentRecordType: ValueType<MailAttachment> = t.record(
  {
    name: t.string({ description: 'Name of the attachment' }),
    mIMEType: t.string({ description: 'MIME type of the attachment E.g. text/plain.' }),
    fileSize: t.integer({ description: 'Approximate size in bytes.' }),
    downloaded: t.boolean({ description: 'Indicates whether the attachment has been downloaded.' }),
    id: t.string({ description: 'The unique identifier of the attachment.' }),
  },
  { description: 'A file attached to a received message.' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<MailClient>['resources'] = {
  RichText: {
    name: 'RichText',
    record: richTextRecordType,
  },
  Attachment: {
    name: 'Attachment',
    record: attachmentRecordType,
  },
  Paragraph: {
    name: 'Paragraph',
    record: paragraphRecordType,
  },
  Word: {
    name: 'Word',
    record: wordRecordType,
  },
  Character: {
    name: 'Character',
    record: characterRecordType,
  },
  AttributeRun: {
    name: 'AttributeRun',
    record: attributeRunRecordType,
  },
  OutgoingMessage: {
    name: 'OutgoingMessage',
    record: outgoingMessageRecordType,
    id: t.integer({ description: 'The unique identifier of the message' }),
  },
  MessageViewer: {
    name: 'MessageViewer',
    record: messageViewerRecordType,
    id: t.integer({ description: 'The unique identifier of the message viewer' }),
  },
  Message: {
    name: 'Message',
    record: messageRecordType,
    id: t.integer({ description: 'The unique identifier of the message.' }),
  },
  Account: {
    name: 'Account',
    record: accountRecordType,
    id: t.string({ description: 'The unique identifier of the account' }),
  },
  Mailbox: {
    name: 'Mailbox',
    record: mailboxRecordType,
  },
  Rule: {
    name: 'Rule',
    record: ruleRecordType,
  },
  RuleCondition: {
    name: 'RuleCondition',
    record: ruleConditionRecordType,
  },
  Recipient: {
    name: 'Recipient',
    record: recipientRecordType,
  },
  BccRecipient: {
    name: 'BccRecipient',
    record: bccRecipientRecordType,
  },
  CcRecipient: {
    name: 'CcRecipient',
    record: ccRecipientRecordType,
  },
  ToRecipient: {
    name: 'ToRecipient',
    record: toRecipientRecordType,
  },
  Header: {
    name: 'Header',
    record: headerRecordType,
  },
  MailAttachment: {
    name: 'MailAttachment',
    record: mailAttachmentRecordType,
    id: t.string({ description: 'The unique identifier of the attachment.' }),
  },
}

const appDeleteOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'mail.app.delete',
  permission: 'mail:app:delete',
  target: { command: 'delete' },
  description: 'Delete an object.',
  input: t.record({}),
  output: t.none(),
}

const appDuplicateOperation: OperationDescriptor<
  { readonly to?: string | undefined; readonly withProperties?: unknown },
  undefined
> = {
  id: 'mail.app.duplicate',
  permission: 'mail:app:duplicate',
  target: { command: 'duplicate' },
  description: 'Copy an object.',
  input: t.record({
    to: t.optional(t.string({ description: 'The location for the new copy or copies.' })),
    withProperties: t.optional(
      t.unknown({ description: 'Properties to set in the new copy or copies right away.' })
    ),
  }),
  output: t.none(),
}

const appMoveOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'mail.app.move',
  permission: 'mail:app:move',
  target: { command: 'move' },
  description: 'Move an object to a new location.',
  input: t.record({
    to: t.string({ description: 'The new location for the object(s).' }),
  }),
  output: t.none(),
}

const messageBounceOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'mail.messages.bounce',
  permission: 'mail:messages:bounce',
  target: { command: 'bounce', resource: 'Message' },
  description: 'Does nothing at all (deprecated)',
  input: t.record({}),
  output: t.none(),
}

const appCheckForNewMailOperation: OperationDescriptor<
  { readonly for?: ObjectReferenceVariant<Account, string> | undefined },
  undefined
> = {
  id: 'mail.app.checkForNewMail',
  permission: 'mail:app:checkForNewMail',
  target: { command: 'checkForNewMail' },
  description: 'Triggers a check for email.',
  input: t.record({
    for: t.optional(
      t.reference<Account, string>(() => resources, 'Account', 'one', {
        description: 'Specify the account that you wish to check for mail',
      })
    ),
  }),
  output: t.none(),
}

const appExtractNameFromOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'mail.app.extractNameFrom',
  permission: 'mail:app:extractNameFrom',
  target: { command: 'extractNameFrom' },
  description:
    'Command to get the full name out of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "John Doe"',
  input: t.record({}),
  output: t.none(),
}

const appExtractAddressFromOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'mail.app.extractAddressFrom',
  permission: 'mail:app:extractAddressFrom',
  target: { command: 'extractAddressFrom' },
  description:
    'Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"',
  input: t.record({}),
  output: t.none(),
}

const messageForwardOperation: OperationDescriptor<
  { readonly openingWindow?: boolean | undefined },
  undefined
> = {
  id: 'mail.messages.forward',
  permission: 'mail:messages:forward',
  target: { command: 'forward', resource: 'Message' },
  description: 'Creates a forwarded message.',
  input: t.record({
    openingWindow: t.optional(
      t.boolean({
        description:
          'Whether the window for the forwarded message is shown. Default is to not show the window.',
      })
    ),
  }),
  output: t.none(),
}

const appGetURLOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'mail.app.getURL',
  permission: 'mail:app:getURL',
  target: { command: 'getURL' },
  description: 'Opens a mailto URL.',
  input: t.record({}),
  output: t.none(),
}

const appImportMailMailboxOperation: OperationDescriptor<{ readonly at: FileSource }, undefined> = {
  id: 'mail.app.importMailMailbox',
  permission: 'mail:app:importMailMailbox',
  target: { command: 'importMailMailbox' },
  description: 'Imports a mailbox created by Mail.',
  input: t.record({
    at: t.fileSource({ description: 'the mailbox or folder of mailboxes to import' }),
  }),
  output: t.none(),
}

const appMailtoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'mail.app.mailto',
  permission: 'mail:app:mailto',
  target: { command: 'mailto' },
  description: 'Opens a mailto URL.',
  input: t.record({}),
  output: t.none(),
}

const appPerformMailActionWithMessagesOperation: OperationDescriptor<
  {
    readonly inMailboxes?: ObjectReferenceVariant<Mailbox, never> | undefined
    readonly forRule?: ObjectReferenceVariant<Rule, never> | undefined
  },
  undefined
> = {
  id: 'mail.app.performMailActionWithMessages',
  permission: 'mail:app:performMailActionWithMessages',
  target: { command: 'performMailActionWithMessages' },
  description:
    'Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.',
  input: t.record({
    inMailboxes: t.optional(
      t.reference<Mailbox, never>(() => resources, 'Mailbox', 'one', {
        description:
          'If the script is being executed by the user selecting an item in the scripts menu, this argument will specify the mailboxes that are currently selected. Otherwise it will not be specified.',
      })
    ),
    forRule: t.optional(
      t.reference<Rule, never>(() => resources, 'Rule', 'one', {
        description:
          'If the script is being executed by a rule action, this argument will be the rule being invoked. Otherwise it will not be specified.',
      })
    ),
  }),
  output: t.none(),
}

const messageRedirectOperation: OperationDescriptor<
  { readonly openingWindow?: boolean | undefined },
  undefined
> = {
  id: 'mail.messages.redirect',
  permission: 'mail:messages:redirect',
  target: { command: 'redirect', resource: 'Message' },
  description: 'Creates a redirected message.',
  input: t.record({
    openingWindow: t.optional(
      t.boolean({
        description:
          'Whether the window for the redirected message is shown. Default is to not show the window.',
      })
    ),
  }),
  output: t.none(),
}

const messageReplyOperation: OperationDescriptor<
  { readonly openingWindow?: boolean | undefined; readonly replyToAll?: boolean | undefined },
  undefined
> = {
  id: 'mail.messages.reply',
  permission: 'mail:messages:reply',
  target: { command: 'reply', resource: 'Message' },
  description: 'Creates a reply message.',
  input: t.record({
    openingWindow: t.optional(
      t.boolean({
        description:
          'Whether the window for the reply message is shown. Default is to not show the window.',
      })
    ),
    replyToAll: t.optional(
      t.boolean({
        description: 'Whether to reply to all recipients. Default is to reply to the sender only.',
      })
    ),
  }),
  output: t.none(),
}

const outgoingMessageSendOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'mail.outgoingmessages.send',
  permission: 'mail:outgoingmessages:send',
  target: { command: 'send', resource: 'OutgoingMessage' },
  description: 'Sends a message.',
  input: t.record({}),
  output: t.none(),
}

const appSynchronizeOperation: OperationDescriptor<
  { readonly with: ObjectReferenceVariant<Account, string> },
  undefined
> = {
  id: 'mail.app.synchronize',
  permission: 'mail:app:synchronize',
  target: { command: 'synchronize' },
  description: 'Command to trigger synchronizing of an IMAP account with the server.',
  input: t.record({
    with: t.reference<Account, string>(() => resources, 'Account', 'one', {
      description: 'The account to synchronize',
    }),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<MailClient>['operations'] = {
  'mail.app.delete': appDeleteOperation,
  'mail.app.duplicate': appDuplicateOperation,
  'mail.app.move': appMoveOperation,
  'mail.messages.bounce': messageBounceOperation,
  'mail.app.checkForNewMail': appCheckForNewMailOperation,
  'mail.app.extractNameFrom': appExtractNameFromOperation,
  'mail.app.extractAddressFrom': appExtractAddressFromOperation,
  'mail.messages.forward': messageForwardOperation,
  'mail.app.getURL': appGetURLOperation,
  'mail.app.importMailMailbox': appImportMailMailboxOperation,
  'mail.app.mailto': appMailtoOperation,
  'mail.app.performMailActionWithMessages': appPerformMailActionWithMessagesOperation,
  'mail.messages.redirect': messageRedirectOperation,
  'mail.messages.reply': messageReplyOperation,
  'mail.outgoingmessages.send': outgoingMessageSendOperation,
  'mail.app.synchronize': appSynchronizeOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): MailClient {
  return {
    outgoingmessages: {
      send: (options) => runtime.invoke(outgoingMessageSendOperation, {}, options),
    },
    messages: {
      bounce: (options) => runtime.invoke(messageBounceOperation, {}, options),
      forward: (openingWindow, options) =>
        runtime.invoke(messageForwardOperation, { openingWindow }, options),
      redirect: (openingWindow, options) =>
        runtime.invoke(messageRedirectOperation, { openingWindow }, options),
      reply: (openingWindow, replyToAll, options) =>
        runtime.invoke(messageReplyOperation, { openingWindow, replyToAll }, options),
    },
    _delete: (options) => runtime.invoke(appDeleteOperation, {}, options),
    duplicate: (to, withProperties, options) =>
      runtime.invoke(appDuplicateOperation, { to, withProperties }, options),
    move: (to, options) => runtime.invoke(appMoveOperation, { to }, options),
    checkForNewMail: (_for, options) =>
      runtime.invoke(appCheckForNewMailOperation, { for: _for }, options),
    extractNameFrom: (options) => runtime.invoke(appExtractNameFromOperation, {}, options),
    extractAddressFrom: (options) => runtime.invoke(appExtractAddressFromOperation, {}, options),
    getURL: (options) => runtime.invoke(appGetURLOperation, {}, options),
    importMailMailbox: (at, options) =>
      runtime.invoke(appImportMailMailboxOperation, { at }, options),
    mailto: (options) => runtime.invoke(appMailtoOperation, {}, options),
    performMailActionWithMessages: (inMailboxes, forRule, options) =>
      runtime.invoke(appPerformMailActionWithMessagesOperation, { inMailboxes, forRule }, options),
    synchronize: (_with, options) =>
      runtime.invoke(appSynchronizeOperation, { with: _with }, options),
  }
}

/**
 * The Mail contract. Pass it to a client factory to obtain a
 * {@link MailClient}.
 */
export const mailContract: AppContract<MailClient> = {
  app: 'mail',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
