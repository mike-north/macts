/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { ServiceType } from './contract/index.js'

export type { Direction } from './contract/index.js'

export type { TransferStatus } from './contract/index.js'

export type { ConnectionStatus } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Participant } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ParticipantCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ParticipantUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Account } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AccountCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AccountUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Chat } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ChatCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ChatUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AccountSchema = z.object({
  id: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  connectionStatus: z.string(),
  serviceType: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ChatSchema = z.object({
  id: z.string(),
  name: z.string(),
})
