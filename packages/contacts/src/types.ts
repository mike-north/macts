/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** SaveableFileFormat */
export type SaveableFileFormat = 'archive'

/** InstantMessageServiceType */
export type InstantMessageServiceType =
  | 'aIM'
  | 'facebook'
  | 'gaduGadu'
  | 'googleTalk'
  | 'iCQ'
  | 'jabber'
  | 'mSN'
  | 'qQ'
  | 'skype'
  | 'yahoo'

/** Address for the given record. */
export interface Address {
  /** City part of the address. */
  city: string
  /** properly formatted string for this address. */
  formattedAddress: string
  /** Street part of the address, multiple lines separated by carriage returns. */
  street: string
  /** unique identifier for this address. */
  id: string
  /** Zip or postal code of the address. */
  zip: string
  /** Country part of the address. */
  country: string
  /** Label. */
  label: string
  /** Country code part of the address (should be a two character iso country code). */
  countryCode: string
  /** State, Province, or Region part of the address. */
  state: string
}

/** Input for creating a Address */
export interface AddressCreateInput {
  /** City part of the address. */
  city?: string
  /** Street part of the address, multiple lines separated by carriage returns. */
  street?: string
  /** unique identifier for this address. */
  id?: string
  /** Zip or postal code of the address. */
  zip?: string
  /** Country part of the address. */
  country?: string
  /** Label. */
  label?: string
  /** Country code part of the address (should be a two character iso country code). */
  countryCode?: string
  /** State, Province, or Region part of the address. */
  state?: string
}

/** Input for updating a Address */
export type AddressUpdateInput = Partial<AddressCreateInput>

/** User name for America Online (AOL) instant messaging. */
export interface AIMHandle {
  /** Unique identifier for this handle */
  id: string
  /** Label for this handle */
  label: string
  /** The AIM handle value */
  value: string
}

/** Input for creating a AIMHandle */
export interface AIMHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The AIM handle value */
  value?: string
}

/** Input for updating a AIMHandle */
export type AIMHandleUpdateInput = Partial<AIMHandleCreateInput>

/** Arbitrary date associated with this person. */
export interface CustomDate {
  /** Unique identifier for this date */
  id: string
  /** Label for this date */
  label: string
  /** The date value */
  value: Date
}

/** Input for creating a CustomDate */
export interface CustomDateCreateInput {
  /** Label for this date */
  label?: string
  /** The date value */
  value?: Date
}

/** Input for updating a CustomDate */
export type CustomDateUpdateInput = Partial<CustomDateCreateInput>

/** Email address for a person. */
export interface Email {
  /** Unique identifier for this email */
  id: string
  /** Label for this email */
  label: string
  /** The email address */
  value: string
}

/** Input for creating a Email */
export interface EmailCreateInput {
  /** Label for this email */
  label?: string
  /** The email address */
  value?: string
}

/** Input for updating a Email */
export type EmailUpdateInput = Partial<EmailCreateInput>

/** A Group Record in the address book database */
export interface Group {
  /** The name of this group. */
  name: string
}

/** Input for creating a Group */
export interface GroupCreateInput {
  /** The name of this group. */
  name?: string
}

/** Input for updating a Group */
export type GroupUpdateInput = Partial<GroupCreateInput>

/** User name for ICQ instant messaging. */
export interface ICQHandle {
  /** Unique identifier for this handle */
  id: string
  /** Label for this handle */
  label: string
  /** The ICQ handle value */
  value: string
}

/** Input for creating a ICQHandle */
export interface ICQHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The ICQ handle value */
  value?: string
}

/** Input for updating a ICQHandle */
export type ICQHandleUpdateInput = Partial<ICQHandleCreateInput>

/** Address for instant messaging. */
export interface InstantMessage {
  /** The service name of this instant message address. */
  serviceName: string
  /** The service type of this instant message address. */
  serviceType: string
  /** The user name of this instant message address. */
  userName: string
}

/** Input for creating a InstantMessage */
export interface InstantMessageCreateInput {
  /** The service type of this instant message address. */
  serviceType?: string
  /** The user name of this instant message address. */
  userName?: string
}

/** Input for updating a InstantMessage */
export type InstantMessageUpdateInput = Partial<InstantMessageCreateInput>

/** User name for Jabber instant messaging. */
export interface JabberHandle {
  /** Unique identifier for this handle */
  id: string
  /** Label for this handle */
  label: string
  /** The Jabber handle value */
  value: string
}

/** Input for creating a JabberHandle */
export interface JabberHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The Jabber handle value */
  value?: string
}

/** Input for updating a JabberHandle */
export type JabberHandleUpdateInput = Partial<JabberHandleCreateInput>

/** User name for Microsoft Network (MSN) instant messaging. */
export interface MSNHandle {
  /** Unique identifier for this handle */
  id: string
  /** Label for this handle */
  label: string
  /** The MSN handle value */
  value: string
}

/** Input for creating a MSNHandle */
export interface MSNHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The MSN handle value */
  value?: string
}

/** Input for updating a MSNHandle */
export type MSNHandleUpdateInput = Partial<MSNHandleCreateInput>

/** A person in the address book database. */
export interface Person {
  /** The Nickname of this person. */
  nickname: string
  /** Organization that employs this person. */
  organization: string
  /** The Maiden name of this person. */
  maidenName: string
  /** The Suffix of this person. */
  suffix: string
  /** Person information in vCard format, this always returns a card in version 3.0 format. */
  vcard: string
  /** The home page of this person. */
  homePage: string
  /** The birth date of this person. */
  birthDate: string
  /** The phonetic version of the Last name of this person. */
  phoneticLastName: string
  /** The title of this person. */
  title: string
  /** The Phonetic version of the Middle name of this person. */
  phoneticMiddleName: string
  /** Department that this person works for. */
  department: string
  /** Image for person. */
  image: string
  /** First/Last name of the person, uses the name display order preference setting in Contacts. */
  name: string
  /** Notes for this person. */
  note: string
  /** Is the current record a company or a person. */
  company: boolean
  /** The Middle name of this person. */
  middleName: string
  /** The phonetic version of the First name of this person. */
  phoneticFirstName: string
  /** The job title of this person. */
  jobTitle: string
  /** The Last name of this person. */
  lastName: string
  /** The First name of this person. */
  firstName: string
}

/** Input for creating a Person */
export interface PersonCreateInput {
  /** The Nickname of this person. */
  nickname?: string
  /** Organization that employs this person. */
  organization?: string
  /** The Maiden name of this person. */
  maidenName?: string
  /** The Suffix of this person. */
  suffix?: string
  /** The home page of this person. */
  homePage?: string
  /** The birth date of this person. */
  birthDate?: string
  /** The phonetic version of the Last name of this person. */
  phoneticLastName?: string
  /** The title of this person. */
  title?: string
  /** The Phonetic version of the Middle name of this person. */
  phoneticMiddleName?: string
  /** Department that this person works for. */
  department?: string
  /** Image for person. */
  image?: string
  /** Notes for this person. */
  note?: string
  /** Is the current record a company or a person. */
  company?: boolean
  /** The Middle name of this person. */
  middleName?: string
  /** The phonetic version of the First name of this person. */
  phoneticFirstName?: string
  /** The job title of this person. */
  jobTitle?: string
  /** The Last name of this person. */
  lastName?: string
  /** The First name of this person. */
  firstName?: string
}

/** Input for updating a Person */
export type PersonUpdateInput = Partial<PersonCreateInput>

/** Phone number for a person. */
export interface Phone {
  /** Unique identifier for this phone */
  id: string
  /** Label for this phone */
  label: string
  /** The phone number */
  value: string
}

/** Input for creating a Phone */
export interface PhoneCreateInput {
  /** Label for this phone */
  label?: string
  /** The phone number */
  value?: string
}

/** Input for updating a Phone */
export type PhoneUpdateInput = Partial<PhoneCreateInput>

/** Other names related to this person. */
export interface RelatedName {
  /** Unique identifier for this name */
  id: string
  /** Label for this name */
  label: string
  /** The related name value */
  value: string
}

/** Input for creating a RelatedName */
export interface RelatedNameCreateInput {
  /** Label for this name */
  label?: string
  /** The related name value */
  value?: string
}

/** Input for updating a RelatedName */
export type RelatedNameUpdateInput = Partial<RelatedNameCreateInput>

/** Profile for social networks. */
export interface SocialProfile {
  /** The persistent unique identifier for this profile. */
  id: string
  /** The service name of this social profile. */
  serviceName: string
  /** The username used with this social profile. */
  userName: string
  /** A service-specific identifier used with this social profile. */
  userIdentifier: string
  /** The URL of this social profile. */
  url: string
}

/** Input for creating a SocialProfile */
export interface SocialProfileCreateInput {
  /** The service name of this social profile. */
  serviceName?: string
  /** The username used with this social profile. */
  userName?: string
  /** A service-specific identifier used with this social profile. */
  userIdentifier?: string
  /** The URL of this social profile. */
  url?: string
}

/** Input for updating a SocialProfile */
export type SocialProfileUpdateInput = Partial<SocialProfileCreateInput>

/** URLs for this person. */
export interface Url {
  /** Unique identifier for this URL */
  id: string
  /** Label for this URL */
  label: string
  /** The URL value */
  value: string
}

/** Input for creating a Url */
export interface UrlCreateInput {
  /** Label for this URL */
  label?: string
  /** The URL value */
  value?: string
}

/** Input for updating a Url */
export type UrlUpdateInput = Partial<UrlCreateInput>

/** User name for Yahoo instant messaging. */
export interface YahooHandle {
  /** Unique identifier for this handle */
  id: string
  /** Label for this handle */
  label: string
  /** The Yahoo handle value */
  value: string
}

/** Input for creating a YahooHandle */
export interface YahooHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The Yahoo handle value */
  value?: string
}

/** Input for updating a YahooHandle */
export type YahooHandleUpdateInput = Partial<YahooHandleCreateInput>

// Zod schemas for runtime validation

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

export const AIMHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const CustomDateSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const EmailSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const GroupSchema = z.object({
  name: z.string(),
})

export const ICQHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const InstantMessageSchema = z.object({
  serviceName: z.string(),
  serviceType: z.string(),
  userName: z.string(),
})

export const JabberHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const MSNHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const PersonSchema = z.object({
  nickname: z.string(),
  organization: z.string(),
  maidenName: z.string(),
  suffix: z.string(),
  vcard: z.string(),
  homePage: z.string(),
  birthDate: z.string(),
  phoneticLastName: z.string(),
  title: z.string(),
  phoneticMiddleName: z.string(),
  department: z.string(),
  image: z.string(),
  name: z.string(),
  note: z.string(),
  company: z.boolean(),
  middleName: z.string(),
  phoneticFirstName: z.string(),
  jobTitle: z.string(),
  lastName: z.string(),
  firstName: z.string(),
})

export const PhoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const RelatedNameSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const SocialProfileSchema = z.object({
  id: z.string(),
  serviceName: z.string(),
  userName: z.string(),
  userIdentifier: z.string(),
  url: z.string(),
})

export const UrlSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

export const YahooHandleSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})
