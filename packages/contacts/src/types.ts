/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { SaveableFileFormat } from './contract/index.js'

export type { InstantMessageServiceType } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Address } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AddressCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AddressUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { AIMHandle } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AIMHandleCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AIMHandleUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { CustomDate } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { CustomDateCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { CustomDateUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Email } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { EmailCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { EmailUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Group } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { GroupCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { GroupUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { ICQHandle } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ICQHandleCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ICQHandleUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { JabberHandle } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { JabberHandleCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { JabberHandleUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MSNHandle } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MSNHandleCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MSNHandleUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Person } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PersonCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PersonUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Phone } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PhoneCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PhoneUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { RelatedName } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { RelatedNameCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { RelatedNameUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SocialProfile } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { SocialProfileCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { SocialProfileUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Url } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { UrlCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { UrlUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { YahooHandle } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { YahooHandleCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { YahooHandleUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AddressSchema = z.object({
  city: z.string(),
  formattedAddress: z.string(),
  street: z.string(),
  id: z.string(),
  zip: z.string(),
  country: z.string(),
  label: z.string(),
  countryCode: z.string(),
  state: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AIMHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CustomDateSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const EmailSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  creationDate: z.string(),
  modificationDate: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ICQHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const JabberHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MSNHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PersonSchema = z.object({
  id: z.string(),
  creationDate: z.string(),
  modificationDate: z.string(),
  nickname: z.string(),
  organization: z.string(),
  maidenName: z.string(),
  suffix: z.string(),
  homePage: z.string(),
  birthDate: z.string(),
  phoneticLastName: z.string(),
  title: z.string(),
  phoneticMiddleName: z.string(),
  department: z.string(),
  name: z.string(),
  note: z.string(),
  company: z.boolean(),
  middleName: z.string(),
  phoneticFirstName: z.string(),
  jobTitle: z.string(),
  lastName: z.string(),
  firstName: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PhoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const RelatedNameSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SocialProfileSchema = z.object({
  id: z.string(),
  serviceName: z.string(),
  userName: z.string(),
  userIdentifier: z.string(),
  url: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const UrlSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const YahooHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})
