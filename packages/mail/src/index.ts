/**
 * Mail HTTP Client SDK.
 *
 * This SDK communicates with the macts API server via HTTP.
 * Requires an API key for authentication.
 *
 * @example
 * ```typescript
 * import { MailClient } from '@macts/sdk-mail';
 *
 * const client = new MailClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * const calendars = await client.calendars.list();
 * ```
 *
 * @packageDocumentation
 */

export { MailClient, MailError, HttpClient } from './client.js'
export type { MailClientOptions } from './client.js'
export * from './types.js'
export { RichTextResourceClient } from './resources/richtext.js'
export { AttachmentResourceClient } from './resources/attachment.js'
export { ParagraphResourceClient } from './resources/paragraph.js'
export { WordResourceClient } from './resources/word.js'
export { CharacterResourceClient } from './resources/character.js'
export { AttributeRunResourceClient } from './resources/attributerun.js'
export { OutgoingMessageResourceClient } from './resources/outgoingmessage.js'
export { MessageViewerResourceClient } from './resources/messageviewer.js'
export { MessageResourceClient } from './resources/message.js'
export { AccountResourceClient } from './resources/account.js'
export { MailboxResourceClient } from './resources/mailbox.js'
export { RuleResourceClient } from './resources/rule.js'
export { RuleConditionResourceClient } from './resources/rulecondition.js'
export { RecipientResourceClient } from './resources/recipient.js'
export { BccRecipientResourceClient } from './resources/bccrecipient.js'
export { CcRecipientResourceClient } from './resources/ccrecipient.js'
export { ToRecipientResourceClient } from './resources/torecipient.js'
export { HeaderResourceClient } from './resources/header.js'
export { MailAttachmentResourceClient } from './resources/mailattachment.js'
export { capabilities } from './capabilities.js'
export type { CapabilityMetadata, CapabilityRisk } from './capabilities.js'
