/**
 * Mail HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { RichTextResourceClient } from './resources/richtext.js';
import { AttachmentResourceClient } from './resources/attachment.js';
import { ParagraphResourceClient } from './resources/paragraph.js';
import { WordResourceClient } from './resources/word.js';
import { CharacterResourceClient } from './resources/character.js';
import { AttributeRunResourceClient } from './resources/attributerun.js';
import { OutgoingMessageResourceClient } from './resources/outgoingmessage.js';
import { MessageViewerResourceClient } from './resources/messageviewer.js';
import { MessageResourceClient } from './resources/message.js';
import { AccountResourceClient } from './resources/account.js';
import { MailboxResourceClient } from './resources/mailbox.js';
import { RuleResourceClient } from './resources/rule.js';
import { RuleConditionResourceClient } from './resources/rulecondition.js';
import { RecipientResourceClient } from './resources/recipient.js';
import { BccRecipientResourceClient } from './resources/bccrecipient.js';
import { CcRecipientResourceClient } from './resources/ccrecipient.js';
import { ToRecipientResourceClient } from './resources/torecipient.js';
import { HeaderResourceClient } from './resources/header.js';
import { MailAttachmentResourceClient } from './resources/mailattachment.js';


/**
 * Client configuration options.
 */
export interface MailClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string;
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { code?: string; message?: string } };
      const code = error?.error?.code ?? 'UNKNOWN_ERROR';
      const message = error?.error?.message ?? `HTTP ${response.status}`;
      throw new MailError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for Mail API errors.
 */
export class MailError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'MailError';
    this.code = code;
  }
}

/**
 * Mail client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new MailClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class MailClient {
  readonly #httpClient: HttpClient;

  /** Rich (styled) text */
  readonly richtext: RichTextResourceClient;

  /** Represents an inline text attachment. This class is used mainly for make commands. */
  readonly attachments: AttachmentResourceClient;

  /** This subdivides the text into paragraphs. */
  readonly paragraphs: ParagraphResourceClient;

  /** This subdivides the text into words. */
  readonly words: WordResourceClient;

  /** This subdivides the text into characters. */
  readonly characters: CharacterResourceClient;

  /** This subdivides the text into chunks that all have the same attributes. */
  readonly attributeruns: AttributeRunResourceClient;

  /** A new email message */
  readonly outgoingmessages: OutgoingMessageResourceClient;

  /** Represents the object responsible for managing a viewer window */
  readonly messageviewers: MessageViewerResourceClient;

  /** An email message */
  readonly messages: MessageResourceClient;

  /** A Mail account for receiving messages (POP/IMAP). To create a new receiving account, use the 'pop account', 'imap account', and 'iCloud account' objects */
  readonly accounts: AccountResourceClient;

  /** A mailbox that holds messages */
  readonly mailboxes: MailboxResourceClient;

  /** Class for message rules */
  readonly rules: RuleResourceClient;

  /** Class for conditions that can be attached to a single rule */
  readonly ruleconditions: RuleConditionResourceClient;

  /** An email recipient */
  readonly recipients: RecipientResourceClient;

  /** An email recipient in the Bcc: field */
  readonly bccrecipients: BccRecipientResourceClient;

  /** An email recipient in the Cc: field */
  readonly ccrecipients: CcRecipientResourceClient;

  /** An email recipient in the To: field */
  readonly torecipients: ToRecipientResourceClient;

  /** A header value for a message. E.g. To, Subject, From. */
  readonly headers: HeaderResourceClient;

  /** A file attached to a received message. */
  readonly mailattachments: MailAttachmentResourceClient;

  constructor(options: MailClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.richtext = new RichTextResourceClient(this.#httpClient, 'mail', 'richtext');
    this.attachments = new AttachmentResourceClient(this.#httpClient, 'mail', 'attachments');
    this.paragraphs = new ParagraphResourceClient(this.#httpClient, 'mail', 'paragraphs');
    this.words = new WordResourceClient(this.#httpClient, 'mail', 'words');
    this.characters = new CharacterResourceClient(this.#httpClient, 'mail', 'characters');
    this.attributeruns = new AttributeRunResourceClient(this.#httpClient, 'mail', 'attributeruns');
    this.outgoingmessages = new OutgoingMessageResourceClient(this.#httpClient, 'mail', 'outgoingmessages');
    this.messageviewers = new MessageViewerResourceClient(this.#httpClient, 'mail', 'messageviewers');
    this.messages = new MessageResourceClient(this.#httpClient, 'mail', 'messages');
    this.accounts = new AccountResourceClient(this.#httpClient, 'mail', 'accounts');
    this.mailboxes = new MailboxResourceClient(this.#httpClient, 'mail', 'mailboxes');
    this.rules = new RuleResourceClient(this.#httpClient, 'mail', 'rules');
    this.ruleconditions = new RuleConditionResourceClient(this.#httpClient, 'mail', 'ruleconditions');
    this.recipients = new RecipientResourceClient(this.#httpClient, 'mail', 'recipients');
    this.bccrecipients = new BccRecipientResourceClient(this.#httpClient, 'mail', 'bccrecipients');
    this.ccrecipients = new CcRecipientResourceClient(this.#httpClient, 'mail', 'ccrecipients');
    this.torecipients = new ToRecipientResourceClient(this.#httpClient, 'mail', 'torecipients');
    this.headers = new HeaderResourceClient(this.#httpClient, 'mail', 'headers');
    this.mailattachments = new MailAttachmentResourceClient(this.#httpClient, 'mail', 'mailattachments');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Delete an object.
   */
  async _delete(): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.delete', {});
  }


  /**
   * Copy an object.
   */
  async duplicate(to?: string, withProperties?: unknown): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.duplicate', { to, withProperties });
  }


  /**
   * Move an object to a new location.
   */
  async move(to: string): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.move', { to });
  }


  /**
   * Triggers a check for email.
   */
  async checkForNewMail(_for?: string): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.checkForNewMail', { 'for': _for });
  }


  /**
   * Command to get the full name out of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "John Doe"
   */
  async extractNameFrom(): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.extractNameFrom', {});
  }


  /**
   * Command to get just the email address of a fully specified email address. E.g. Calling this with "John Doe <jdoe@example.com>" as the direct object would return "jdoe@example.com"
   */
  async extractAddressFrom(): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.extractAddressFrom', {});
  }


  /**
   * Opens a mailto URL.
   */
  async getURL(): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.getURL', {});
  }


  /**
   * Imports a mailbox created by Mail.
   */
  async importMailMailbox(at: string): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.importMailMailbox', { at });
  }


  /**
   * Opens a mailto URL.
   */
  async mailto(): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.mailto', {});
  }


  /**
   * Script handler invoked by rules and menus that execute AppleScripts. The direct parameter of this handler is a list of messages being acted upon.
   */
  async performMailActionWithMessages(inMailboxes?: string, forRule?: string): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.performMailActionWithMessages', { inMailboxes, forRule });
  }


  /**
   * Command to trigger synchronizing of an IMAP account with the server.
   */
  async synchronize(_with: string): Promise<void> {
    return this.#httpClient.rpc<void>('mail.app.synchronize', { 'with': _with });
  }
}
