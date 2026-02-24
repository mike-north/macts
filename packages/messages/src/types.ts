/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** ServiceType */
export type ServiceType = 'sMS' | 'iMessage' | 'rCS';

/** Direction */
export type Direction = 'incoming' | 'outgoing';

/** TransferStatus */
export type TransferStatus = 'preparing' | 'waiting' | 'transferring' | 'finalizing' | 'finished' | 'failed';

/** ConnectionStatus */
export type ConnectionStatus = 'disconnecting' | 'connected' | 'connecting' | 'disconnected';

/** A participant for an account. */
export interface Participant {
  /** The participant's unique identifier. For example: 01234567-89AB-CDEF-0123-456789ABCDEF:+11234567890 */
  id: string;
  /** The account for this participant. */
  account: Account;
  /** The participant's name as it appears in the participant list. */
  name: string;
  /** The participant's handle. */
  handle: string;
  /** The first name from this participan's Contacts card, if available */
  firstName: string;
  /** The last name from this participant's Contacts card, if available */
  lastName: string;
  /** The full name from this participant's Contacts card, if available */
  fullName: string;
}

/** Input for creating a Participant */
export type ParticipantCreateInput = Record<string, never>;

/** Input for updating a Participant */
export type ParticipantUpdateInput = Partial<ParticipantCreateInput>;

/** An account that can be logged in to from this system */
export interface Account {
  /** A unique identifier for this account. */
  id: string;
  /** The name of this account as defined in Account preferences description field */
  description: string;
  /** Is the account enabled? */
  enabled: boolean;
  /** The connection status for this account. */
  connectionStatus: string;
  /** The type of service for this account */
  serviceType: string;
}

/** Input for creating a Account */
export interface AccountCreateInput {
  /** Is the account enabled? */
  enabled?: boolean;
}

/** Input for updating a Account */
export type AccountUpdateInput = Partial<AccountCreateInput>;

/** An SMS or iMessage chat. */
export interface Chat {
  /** A guid identifier for this chat. */
  id: string;
  /** The chat's name as it appears in the chat list. */
  name: string;
  /** The account which is participating in this chat. */
  account: Account;
}

/** Input for creating a Chat */
export type ChatCreateInput = Record<string, never>;

/** Input for updating a Chat */
export type ChatUpdateInput = Partial<ChatCreateInput>;

// Zod schemas for runtime validation

export const ParticipantSchema = z.object({
  id: z.string(),
  account: z.string(),
  name: z.string(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
});

export const AccountSchema = z.object({
  id: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  connectionStatus: z.string(),
  serviceType: z.string(),
});

export const ChatSchema = z.object({
  id: z.string(),
  name: z.string(),
  account: z.string(),
});
