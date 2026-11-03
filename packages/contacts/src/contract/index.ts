/**
 * The Contacts contract: the transport-neutral description of every
 * Contacts operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `ContactsClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `ContactsClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Contacts manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type ObjectReferenceData,
  type OperationDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

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
  /**
   * City part of the address.
   * Nullable. No evidence that the app always sets it.
   */
  city: string | null
  /**
   * properly formatted string for this address.
   * Nullable. No evidence that the app always sets it.
   */
  readonly formattedAddress: string | null
  /**
   * Street part of the address, multiple lines separated by carriage returns.
   * Nullable. No evidence that the app always sets it.
   */
  street: string | null
  /**
   * unique identifier for this address.
   * Never null: the primary identifier.
   */
  id: string
  /**
   * Zip or postal code of the address.
   * Nullable. Observed missing in 1 of 12 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  zip: string | null
  /**
   * Country part of the address.
   * Nullable. Observed missing in 4 of 12 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  country: string | null
  /**
   * Label.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * Country code part of the address (should be a two character iso country code).
   * Nullable. Observed missing in 6 of 12 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  countryCode: string | null
  /**
   * State, Province, or Region part of the address.
   * Nullable. No evidence that the app always sets it.
   */
  state: string | null
}

/** User name for America Online (AOL) instant messaging. */
export interface AIMHandle {
  /**
   * Unique identifier for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The AIM handle value.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** Arbitrary date associated with this person. */
export interface CustomDate {
  /**
   * Unique identifier for this date.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this date.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The date value.
   * Nullable. No evidence that the app always sets it.
   */
  value: Date | null
}

/** Email address for a person. */
export interface Email {
  /**
   * Unique identifier for this email.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Label for this email.
   * Never null: observed in all 32 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  label: string
  /**
   * The email address.
   * Never null: observed in all 32 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  value: string
}

/** A Group Record in the address book database */
export interface Group {
  /**
   * Unique and persistent identifier for this record.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of this group.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * When the contact was created.
   * Nullable. No evidence that the app always sets it.
   */
  readonly creationDate: Date | null
  /**
   * When the contact was last modified.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modificationDate: Date | null
}

/** User name for ICQ instant messaging. */
export interface ICQHandle {
  /**
   * Unique identifier for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The ICQ handle value.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** User name for Jabber instant messaging. */
export interface JabberHandle {
  /**
   * Unique identifier for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The Jabber handle value.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** User name for Microsoft Network (MSN) instant messaging. */
export interface MSNHandle {
  /**
   * Unique identifier for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The MSN handle value.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** A person in the address book database. */
export interface Person {
  /**
   * Unique and persistent identifier for this record.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * When the contact was created.
   * Nullable. No evidence that the app always sets it.
   */
  readonly creationDate: Date | null
  /**
   * When the contact was last modified.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modificationDate: Date | null
  /**
   * The Nickname of this person.
   * Nullable. Observed missing in 22 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  nickname: string | null
  /**
   * Organization that employs this person.
   * Nullable. Observed missing in 17 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  organization: string | null
  /**
   * The Maiden name of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  maidenName: string | null
  /**
   * The Suffix of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  suffix: string | null
  /**
   * Person information in vCard format, this always returns a card in version 3.0 format.
   * Nullable. No evidence that the app always sets it.
   */
  readonly vcard: string | null
  /**
   * The home page of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  homePage: string | null
  /**
   * The birth date of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  birthDate: Date | null
  /**
   * The phonetic version of the Last name of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  phoneticLastName: string | null
  /**
   * The title of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  title: string | null
  /**
   * The Phonetic version of the Middle name of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  phoneticMiddleName: string | null
  /**
   * Department that this person works for.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  department: string | null
  /**
   * Image for person.
   * Nullable. No evidence that the app always sets it.
   */
  image: string | null
  /**
   * First/Last name of the person, uses the name display order preference setting in Contacts.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * Notes for this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  note: string | null
  /**
   * Is the current record a company or a person.
   * Nullable. No evidence that the app always sets it.
   */
  company: boolean | null
  /**
   * The Middle name of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  middleName: string | null
  /**
   * The phonetic version of the First name of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  phoneticFirstName: string | null
  /**
   * The job title of this person.
   * Nullable. Observed missing in 23 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  jobTitle: string | null
  /**
   * The Last name of this person.
   * Nullable. Observed missing in 6 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  lastName: string | null
  /**
   * The First name of this person.
   * Nullable. Observed missing in 1 of 23 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  firstName: string | null
}

/** Phone number for a person. */
export interface Phone {
  /**
   * Unique identifier for this phone.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * Label for this phone.
   * Never null: observed in all 48 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  label: string
  /**
   * The phone number.
   * Never null: observed in all 48 items (Contacts 14.0, macOS 27.2, 2026-11-01).
   */
  value: string
}

/** Other names related to this person. */
export interface RelatedName {
  /**
   * Unique identifier for this name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this name.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The related name value.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** Profile for social networks. */
export interface SocialProfile {
  /**
   * The persistent unique identifier for this profile.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The service name of this social profile.
   * Nullable. No evidence that the app always sets it.
   */
  serviceName: string | null
  /**
   * The username used with this social profile.
   * Nullable. No evidence that the app always sets it.
   */
  userName: string | null
  /**
   * A service-specific identifier used with this social profile.
   * Nullable. No evidence that the app always sets it.
   */
  userIdentifier: string | null
  /**
   * The URL of this social profile.
   * Nullable. No evidence that the app always sets it.
   */
  url: string | null
}

/** URLs for this person. */
export interface Url {
  /**
   * Unique identifier for this URL.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this URL.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The URL value.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** User name for Yahoo instant messaging. */
export interface YahooHandle {
  /**
   * Unique identifier for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  readonly id: string | null
  /**
   * Label for this handle.
   * Nullable. No evidence that the app always sets it.
   */
  label: string | null
  /**
   * The Yahoo handle value.
   * Nullable. No evidence that the app always sets it.
   */
  value: string | null
}

/** Input for creating an Address. */
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

/** Input for updating an Address. Omitted fields are left unchanged. */
export interface AddressUpdateInput {
  /**
   * City part of the address.
   * Cannot be reset: null is rejected.
   */
  city?: string
  /**
   * Street part of the address, multiple lines separated by carriage returns.
   * Cannot be reset: null is rejected.
   */
  street?: string
  /**
   * unique identifier for this address.
   * Cannot be reset: null is rejected.
   */
  id?: string
  /**
   * Zip or postal code of the address.
   * Cannot be reset: null is rejected.
   */
  zip?: string
  /**
   * Country part of the address.
   * Cannot be reset: null is rejected.
   */
  country?: string
  /**
   * Label.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * Country code part of the address (should be a two character iso country code).
   * Cannot be reset: null is rejected.
   */
  countryCode?: string
  /**
   * State, Province, or Region part of the address.
   * Cannot be reset: null is rejected.
   */
  state?: string
}

/** Input for creating an AIMHandle. */
export interface AIMHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The AIM handle value */
  value?: string
}

/** Input for updating an AIMHandle. Omitted fields are left unchanged. */
export interface AIMHandleUpdateInput {
  /**
   * Label for this handle.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The AIM handle value.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a CustomDate. */
export interface CustomDateCreateInput {
  /** Label for this date */
  label?: string
  /** The date value */
  value?: Date
}

/** Input for updating a CustomDate. Omitted fields are left unchanged. */
export interface CustomDateUpdateInput {
  /**
   * Label for this date.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The date value.
   * Cannot be reset: null is rejected.
   */
  value?: Date
}

/** Input for creating an Email. */
export interface EmailCreateInput {
  /** Label for this email */
  label?: string
  /** The email address */
  value?: string
}

/** Input for updating an Email. Omitted fields are left unchanged. */
export interface EmailUpdateInput {
  /**
   * Label for this email.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The email address.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a Group. */
export interface GroupCreateInput {
  /** The name of this group. */
  name?: string
}

/** Input for updating a Group. Omitted fields are left unchanged. */
export interface GroupUpdateInput {
  /**
   * The name of this group.
   * Cannot be reset: null is rejected.
   */
  name?: string
}

/** Input for creating an ICQHandle. */
export interface ICQHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The ICQ handle value */
  value?: string
}

/** Input for updating an ICQHandle. Omitted fields are left unchanged. */
export interface ICQHandleUpdateInput {
  /**
   * Label for this handle.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The ICQ handle value.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a JabberHandle. */
export interface JabberHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The Jabber handle value */
  value?: string
}

/** Input for updating a JabberHandle. Omitted fields are left unchanged. */
export interface JabberHandleUpdateInput {
  /**
   * Label for this handle.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The Jabber handle value.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a MSNHandle. */
export interface MSNHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The MSN handle value */
  value?: string
}

/** Input for updating a MSNHandle. Omitted fields are left unchanged. */
export interface MSNHandleUpdateInput {
  /**
   * Label for this handle.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The MSN handle value.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a Person. */
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
  birthDate?: Date
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

/** Input for updating a Person. Omitted fields are left unchanged. */
export interface PersonUpdateInput {
  /**
   * The Nickname of this person.
   * Cannot be reset: null is rejected.
   */
  nickname?: string
  /**
   * Organization that employs this person.
   * Cannot be reset: null is rejected.
   */
  organization?: string
  /**
   * The Maiden name of this person.
   * Cannot be reset: null is rejected.
   */
  maidenName?: string
  /**
   * The Suffix of this person.
   * Cannot be reset: null is rejected.
   */
  suffix?: string
  /**
   * The home page of this person.
   * Cannot be reset: null is rejected.
   */
  homePage?: string
  /**
   * The birth date of this person.
   * Cannot be reset: null is rejected.
   */
  birthDate?: Date
  /**
   * The phonetic version of the Last name of this person.
   * Cannot be reset: null is rejected.
   */
  phoneticLastName?: string
  /**
   * The title of this person.
   * Cannot be reset: null is rejected.
   */
  title?: string
  /**
   * The Phonetic version of the Middle name of this person.
   * Cannot be reset: null is rejected.
   */
  phoneticMiddleName?: string
  /**
   * Department that this person works for.
   * Cannot be reset: null is rejected.
   */
  department?: string
  /**
   * Image for person.
   * Cannot be reset: null is rejected.
   */
  image?: string
  /**
   * Notes for this person.
   * Cannot be reset: null is rejected.
   */
  note?: string
  /**
   * Is the current record a company or a person.
   * Cannot be reset: null is rejected.
   */
  company?: boolean
  /**
   * The Middle name of this person.
   * Cannot be reset: null is rejected.
   */
  middleName?: string
  /**
   * The phonetic version of the First name of this person.
   * Cannot be reset: null is rejected.
   */
  phoneticFirstName?: string
  /**
   * The job title of this person.
   * Cannot be reset: null is rejected.
   */
  jobTitle?: string
  /**
   * The Last name of this person.
   * Cannot be reset: null is rejected.
   */
  lastName?: string
  /**
   * The First name of this person.
   * Cannot be reset: null is rejected.
   */
  firstName?: string
}

/** Input for creating a Phone. */
export interface PhoneCreateInput {
  /** Label for this phone */
  label?: string
  /** The phone number */
  value?: string
}

/** Input for updating a Phone. Omitted fields are left unchanged. */
export interface PhoneUpdateInput {
  /**
   * Label for this phone.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The phone number.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a RelatedName. */
export interface RelatedNameCreateInput {
  /** Label for this name */
  label?: string
  /** The related name value */
  value?: string
}

/** Input for updating a RelatedName. Omitted fields are left unchanged. */
export interface RelatedNameUpdateInput {
  /**
   * Label for this name.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The related name value.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a SocialProfile. */
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

/** Input for updating a SocialProfile. Omitted fields are left unchanged. */
export interface SocialProfileUpdateInput {
  /**
   * The service name of this social profile.
   * Cannot be reset: null is rejected.
   */
  serviceName?: string
  /**
   * The username used with this social profile.
   * Cannot be reset: null is rejected.
   */
  userName?: string
  /**
   * A service-specific identifier used with this social profile.
   * Cannot be reset: null is rejected.
   */
  userIdentifier?: string
  /**
   * The URL of this social profile.
   * Cannot be reset: null is rejected.
   */
  url?: string
}

/** Input for creating an Url. */
export interface UrlCreateInput {
  /** Label for this URL */
  label?: string
  /** The URL value */
  value?: string
}

/** Input for updating an Url. Omitted fields are left unchanged. */
export interface UrlUpdateInput {
  /**
   * Label for this URL.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The URL value.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Input for creating a YahooHandle. */
export interface YahooHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The Yahoo handle value */
  value?: string
}

/** Input for updating a YahooHandle. Omitted fields are left unchanged. */
export interface YahooHandleUpdateInput {
  /**
   * Label for this handle.
   * Cannot be reset: null is rejected.
   */
  label?: string
  /**
   * The Yahoo handle value.
   * Cannot be reset: null is rejected.
   */
  value?: string
}

/** Address for the given record. */
export interface AddressResourceClient {
  /**
   * List addresses.
   *
   * @param personId - Identifier of the person. Does not accept null.
   */
  list(personId: string, options?: CallOptions): Promise<readonly Address[]>
  /**
   * Read the address identified by `id` within `personId`.
   *
   * @param personId - Identifier of the person. Does not accept null.
   * @param id - Identifier of the address. Does not accept null.
   */
  get(personId: string, id: string, options?: CallOptions): Promise<Address>
}

/** Email address for a person. */
export interface EmailResourceClient {
  /**
   * List emails.
   *
   * @param personId - Identifier of the person. Does not accept null.
   */
  list(personId: string, options?: CallOptions): Promise<readonly Email[]>
  /**
   * Read the email identified by `id` within `personId`.
   *
   * @param personId - Identifier of the person. Does not accept null.
   * @param id - Identifier of the email address. Does not accept null.
   */
  get(personId: string, id: string, options?: CallOptions): Promise<Email>
}

/** A Group Record in the address book database */
export interface GroupResourceClient {
  /** List groups. */
  list(options?: CallOptions): Promise<readonly Group[]>
  /**
   * Read the group identified by `id`.
   *
   * @param id - Identifier of the group. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Group>
}

/** A person in the address book database. */
export interface PersonResourceClient {
  /** List people. */
  list(options?: CallOptions): Promise<readonly Person[]>
  /**
   * Read the person identified by `id`.
   *
   * @param id - Identifier of the person. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Person>
}

/** Phone number for a person. */
export interface PhoneResourceClient {
  /**
   * List phones.
   *
   * @param personId - Identifier of the person. Does not accept null.
   */
  list(personId: string, options?: CallOptions): Promise<readonly Phone[]>
  /**
   * Read the phone identified by `id` within `personId`.
   *
   * @param personId - Identifier of the person. Does not accept null.
   * @param id - Identifier of the phone number. Does not accept null.
   */
  get(personId: string, id: string, options?: CallOptions): Promise<Phone>
}

/**
 * The Contacts client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link contactsContract}.
 */
export interface ContactsClient {
  /** Address for the given record. */
  readonly addresses: AddressResourceClient
  /** Email address for a person. */
  readonly emails: EmailResourceClient
  /** A Group Record in the address book database */
  readonly groups: GroupResourceClient
  /** A person in the address book database. */
  readonly people: PersonResourceClient
  /** Phone number for a person. */
  readonly phones: PhoneResourceClient
  /**
   * Create a new object.
   *
   * @param _new - The class of the new object. Does not accept null.
   * @param at - The location at which to insert the object. Does not accept null.
   * @param withData - The initial contents of the object. Does not accept null.
   * @param withProperties - The initial values for properties of the object. Does not accept null.
   */
  make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /**
   * Add a child object.
   *
   * @param to - where to add this child to. Does not accept null.
   */
  add(to: string, options?: CallOptions): Promise<void>
  /**
   * Remove a child object.
   *
   * @param from - where to remove this child from. Does not accept null.
   */
  remove(from: string, options?: CallOptions): Promise<void>
  /** Save all Contacts changes. Also see the unsaved property for the application class. */
  save(options?: CallOptions): Promise<void>
  /**
   * RollOver - Which property this roll over is associated with (Properties can be one of maiden
   * name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo,
   * address.)
   */
  actionProperty(options?: CallOptions): Promise<void>
  /**
   * RollOver - Returns the title that will be placed in the menu for this roll over
   *
   * @param _with - property that that was returned from the "action property" handler. Does not
   * accept null.
   * @param _for - Currently selected person. Does not accept null.
   */
  actionTitle(
    _with: unknown,
    _for: ObjectReferenceData<string, 'Person'>,
    options?: CallOptions
  ): Promise<void>
  /**
   * RollOver - Performs the action on the given person and value
   *
   * @param _with - property that that was returned from the "action property" handler. Does not
   * accept null.
   * @param _for - Currently selected person. Does not accept null.
   */
  performAction(
    _with: unknown,
    _for: ObjectReferenceData<string, 'Person'>,
    options?: CallOptions
  ): Promise<void>
  /**
   * RollOver - Determines if the rollover action should be enabled for the given person and value
   *
   * @param _with - property that that was returned from the "action property" handler. Does not
   * accept null.
   * @param _for - Currently selected person. Does not accept null.
   */
  shouldEnableAction(
    _with: unknown,
    _for: ObjectReferenceData<string, 'Person'>,
    options?: CallOptions
  ): Promise<void>
}

const addressRecordType: ValueType<Address> = t.record(
  {
    city: t.nullable(t.string(), { description: 'City part of the address.' }),
    formattedAddress: t.nullable(t.string(), {
      description: 'properly formatted string for this address.',
    }),
    street: t.nullable(t.string(), {
      description: 'Street part of the address, multiple lines separated by carriage returns.',
    }),
    id: t.string({ description: 'unique identifier for this address.' }),
    zip: t.nullable(t.string(), { description: 'Zip or postal code of the address.' }),
    country: t.nullable(t.string(), { description: 'Country part of the address.' }),
    label: t.nullable(t.string(), { description: 'Label.' }),
    countryCode: t.nullable(t.string(), {
      description: 'Country code part of the address (should be a two character iso country code).',
    }),
    state: t.nullable(t.string(), {
      description: 'State, Province, or Region part of the address.',
    }),
  },
  { description: 'Address for the given record.' }
)

const aimHandleRecordType: ValueType<AIMHandle> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this handle' }),
    label: t.nullable(t.string(), { description: 'Label for this handle' }),
    value: t.nullable(t.string(), { description: 'The AIM handle value' }),
  },
  { description: 'User name for America Online (AOL) instant messaging.' }
)

const customDateRecordType: ValueType<CustomDate> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this date' }),
    label: t.nullable(t.string(), { description: 'Label for this date' }),
    value: t.nullable(t.date(), { description: 'The date value' }),
  },
  { description: 'Arbitrary date associated with this person.' }
)

const emailRecordType: ValueType<Email> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this email' }),
    label: t.string({ description: 'Label for this email' }),
    value: t.string({ description: 'The email address' }),
  },
  { description: 'Email address for a person.' }
)

const groupRecordType: ValueType<Group> = t.record(
  {
    id: t.string({ description: 'Unique and persistent identifier for this record.' }),
    name: t.nullable(t.string(), { description: 'The name of this group.' }),
    creationDate: t.nullable(t.date(), { description: 'When the contact was created.' }),
    modificationDate: t.nullable(t.date(), { description: 'When the contact was last modified.' }),
  },
  { description: 'A Group Record in the address book database' }
)

const icqHandleRecordType: ValueType<ICQHandle> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this handle' }),
    label: t.nullable(t.string(), { description: 'Label for this handle' }),
    value: t.nullable(t.string(), { description: 'The ICQ handle value' }),
  },
  { description: 'User name for ICQ instant messaging.' }
)

const jabberHandleRecordType: ValueType<JabberHandle> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this handle' }),
    label: t.nullable(t.string(), { description: 'Label for this handle' }),
    value: t.nullable(t.string(), { description: 'The Jabber handle value' }),
  },
  { description: 'User name for Jabber instant messaging.' }
)

const msnHandleRecordType: ValueType<MSNHandle> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this handle' }),
    label: t.nullable(t.string(), { description: 'Label for this handle' }),
    value: t.nullable(t.string(), { description: 'The MSN handle value' }),
  },
  { description: 'User name for Microsoft Network (MSN) instant messaging.' }
)

const personRecordType: ValueType<Person> = t.record(
  {
    id: t.string({ description: 'Unique and persistent identifier for this record.' }),
    creationDate: t.nullable(t.date(), { description: 'When the contact was created.' }),
    modificationDate: t.nullable(t.date(), { description: 'When the contact was last modified.' }),
    nickname: t.nullable(t.string(), { description: 'The Nickname of this person.' }),
    organization: t.nullable(t.string(), { description: 'Organization that employs this person.' }),
    maidenName: t.nullable(t.string(), { description: 'The Maiden name of this person.' }),
    suffix: t.nullable(t.string(), { description: 'The Suffix of this person.' }),
    vcard: t.nullable(t.string(), {
      description:
        'Person information in vCard format, this always returns a card in version 3.0 format.',
    }),
    homePage: t.nullable(t.string(), { description: 'The home page of this person.' }),
    birthDate: t.nullable(t.date(), { description: 'The birth date of this person.' }),
    phoneticLastName: t.nullable(t.string(), {
      description: 'The phonetic version of the Last name of this person.',
    }),
    title: t.nullable(t.string(), { description: 'The title of this person.' }),
    phoneticMiddleName: t.nullable(t.string(), {
      description: 'The Phonetic version of the Middle name of this person.',
    }),
    department: t.nullable(t.string(), { description: 'Department that this person works for.' }),
    image: t.nullable(t.string(), { description: 'Image for person.' }),
    name: t.nullable(t.string(), {
      description:
        'First/Last name of the person, uses the name display order preference setting in Contacts.',
    }),
    note: t.nullable(t.string(), { description: 'Notes for this person.' }),
    company: t.nullable(t.boolean(), {
      description: 'Is the current record a company or a person.',
    }),
    middleName: t.nullable(t.string(), { description: 'The Middle name of this person.' }),
    phoneticFirstName: t.nullable(t.string(), {
      description: 'The phonetic version of the First name of this person.',
    }),
    jobTitle: t.nullable(t.string(), { description: 'The job title of this person.' }),
    lastName: t.nullable(t.string(), { description: 'The Last name of this person.' }),
    firstName: t.nullable(t.string(), { description: 'The First name of this person.' }),
  },
  { description: 'A person in the address book database.' }
)

const phoneRecordType: ValueType<Phone> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this phone' }),
    label: t.string({ description: 'Label for this phone' }),
    value: t.string({ description: 'The phone number' }),
  },
  { description: 'Phone number for a person.' }
)

const relatedNameRecordType: ValueType<RelatedName> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this name' }),
    label: t.nullable(t.string(), { description: 'Label for this name' }),
    value: t.nullable(t.string(), { description: 'The related name value' }),
  },
  { description: 'Other names related to this person.' }
)

const socialProfileRecordType: ValueType<SocialProfile> = t.record(
  {
    id: t.string({ description: 'The persistent unique identifier for this profile.' }),
    serviceName: t.nullable(t.string(), {
      description: 'The service name of this social profile.',
    }),
    userName: t.nullable(t.string(), {
      description: 'The username used with this social profile.',
    }),
    userIdentifier: t.nullable(t.string(), {
      description: 'A service-specific identifier used with this social profile.',
    }),
    url: t.nullable(t.string(), { description: 'The URL of this social profile.' }),
  },
  { description: 'Profile for social networks.' }
)

const urlRecordType: ValueType<Url> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this URL' }),
    label: t.nullable(t.string(), { description: 'Label for this URL' }),
    value: t.nullable(t.string(), { description: 'The URL value' }),
  },
  { description: 'URLs for this person.' }
)

const yahooHandleRecordType: ValueType<YahooHandle> = t.record(
  {
    id: t.nullable(t.string(), { description: 'Unique identifier for this handle' }),
    label: t.nullable(t.string(), { description: 'Label for this handle' }),
    value: t.nullable(t.string(), { description: 'The Yahoo handle value' }),
  },
  { description: 'User name for Yahoo instant messaging.' }
)

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<ContactsClient>['resources'] = {
  Address: {
    name: 'Address',
    record: addressRecordType,
    id: t.string({ description: 'unique identifier for this address.' }),
    get: 'contacts.addresses.get',
    list: 'contacts.addresses.list',
  },
  AIMHandle: {
    name: 'AIMHandle',
    record: aimHandleRecordType,
  },
  CustomDate: {
    name: 'CustomDate',
    record: customDateRecordType,
  },
  Email: {
    name: 'Email',
    record: emailRecordType,
    id: t.string({ description: 'Unique identifier for this email' }),
    get: 'contacts.emails.get',
    list: 'contacts.emails.list',
  },
  Group: {
    name: 'Group',
    record: groupRecordType,
    id: t.string({ description: 'Unique and persistent identifier for this record.' }),
    get: 'contacts.groups.get',
    list: 'contacts.groups.list',
  },
  ICQHandle: {
    name: 'ICQHandle',
    record: icqHandleRecordType,
  },
  JabberHandle: {
    name: 'JabberHandle',
    record: jabberHandleRecordType,
  },
  MSNHandle: {
    name: 'MSNHandle',
    record: msnHandleRecordType,
  },
  Person: {
    name: 'Person',
    record: personRecordType,
    id: t.string({ description: 'Unique and persistent identifier for this record.' }),
    get: 'contacts.people.get',
    list: 'contacts.people.list',
  },
  Phone: {
    name: 'Phone',
    record: phoneRecordType,
    id: t.string({ description: 'Unique identifier for this phone' }),
    get: 'contacts.phones.get',
    list: 'contacts.phones.list',
  },
  RelatedName: {
    name: 'RelatedName',
    record: relatedNameRecordType,
  },
  SocialProfile: {
    name: 'SocialProfile',
    record: socialProfileRecordType,
    id: t.string({ description: 'The persistent unique identifier for this profile.' }),
  },
  Url: {
    name: 'Url',
    record: urlRecordType,
  },
  YahooHandle: {
    name: 'YahooHandle',
    record: yahooHandleRecordType,
  },
}

const personListPeopleOperation: OperationDescriptor<Record<string, never>, readonly Person[]> = {
  id: 'contacts.people.list',
  permission: 'contacts:people:list',
  target: { command: 'listPeople', resource: 'Person' },
  description: 'List every person',
  input: t.record({}),
  output: t.array(personRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const personGetPersonOperation: OperationDescriptor<{ readonly id: string }, Person> = {
  id: 'contacts.people.get',
  permission: 'contacts:people:get',
  target: { command: 'getPerson', resource: 'Person' },
  description: 'Get a person by identifier',
  input: t.record({
    id: t.string({ description: 'Identifier of the person' }),
  }),
  output: personRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Identifier of the person' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const groupListGroupsOperation: OperationDescriptor<Record<string, never>, readonly Group[]> = {
  id: 'contacts.groups.list',
  permission: 'contacts:groups:list',
  target: { command: 'listGroups', resource: 'Group' },
  description: 'List every group',
  input: t.record({}),
  output: t.array(groupRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const groupGetGroupOperation: OperationDescriptor<{ readonly id: string }, Group> = {
  id: 'contacts.groups.get',
  permission: 'contacts:groups:get',
  target: { command: 'getGroup', resource: 'Group' },
  description: 'Get a group by identifier',
  input: t.record({
    id: t.string({ description: 'Identifier of the group' }),
  }),
  output: groupRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Identifier of the group' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const emailListEmailsOperation: OperationDescriptor<
  { readonly personId: string },
  readonly Email[]
> = {
  id: 'contacts.emails.list',
  permission: 'contacts:emails:list',
  target: { command: 'listEmails', resource: 'Email' },
  description: 'List the email addresses of a person',
  input: t.record({
    personId: t.string({ description: 'Identifier of the person' }),
  }),
  output: t.array(emailRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { personId: { type: 'string', description: 'Identifier of the person' } },
    required: ['personId'],
    additionalProperties: false,
  },
}

const emailGetEmailOperation: OperationDescriptor<
  { readonly personId: string; readonly id: string },
  Email
> = {
  id: 'contacts.emails.get',
  permission: 'contacts:emails:get',
  target: { command: 'getEmail', resource: 'Email' },
  description: 'Get one email address of a person by its identifier',
  input: t.record({
    personId: t.string({ description: 'Identifier of the person' }),
    id: t.string({ description: 'Identifier of the email address' }),
  }),
  output: emailRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      personId: { type: 'string', description: 'Identifier of the person' },
      id: { type: 'string', description: 'Identifier of the email address' },
    },
    required: ['personId', 'id'],
    additionalProperties: false,
  },
}

const phoneListPhonesOperation: OperationDescriptor<
  { readonly personId: string },
  readonly Phone[]
> = {
  id: 'contacts.phones.list',
  permission: 'contacts:phones:list',
  target: { command: 'listPhones', resource: 'Phone' },
  description: 'List the phone numbers of a person',
  input: t.record({
    personId: t.string({ description: 'Identifier of the person' }),
  }),
  output: t.array(phoneRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { personId: { type: 'string', description: 'Identifier of the person' } },
    required: ['personId'],
    additionalProperties: false,
  },
}

const phoneGetPhoneOperation: OperationDescriptor<
  { readonly personId: string; readonly id: string },
  Phone
> = {
  id: 'contacts.phones.get',
  permission: 'contacts:phones:get',
  target: { command: 'getPhone', resource: 'Phone' },
  description: 'Get one phone number of a person by its identifier',
  input: t.record({
    personId: t.string({ description: 'Identifier of the person' }),
    id: t.string({ description: 'Identifier of the phone number' }),
  }),
  output: phoneRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      personId: { type: 'string', description: 'Identifier of the person' },
      id: { type: 'string', description: 'Identifier of the phone number' },
    },
    required: ['personId', 'id'],
    additionalProperties: false,
  },
}

const addressListAddressesOperation: OperationDescriptor<
  { readonly personId: string },
  readonly Address[]
> = {
  id: 'contacts.addresses.list',
  permission: 'contacts:addresses:list',
  target: { command: 'listAddresses', resource: 'Address' },
  description: 'List the addresses of a person',
  input: t.record({
    personId: t.string({ description: 'Identifier of the person' }),
  }),
  output: t.array(addressRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { personId: { type: 'string', description: 'Identifier of the person' } },
    required: ['personId'],
    additionalProperties: false,
  },
}

const addressGetAddressOperation: OperationDescriptor<
  { readonly personId: string; readonly id: string },
  Address
> = {
  id: 'contacts.addresses.get',
  permission: 'contacts:addresses:get',
  target: { command: 'getAddress', resource: 'Address' },
  description: 'Get one address of a person by its identifier',
  input: t.record({
    personId: t.string({ description: 'Identifier of the person' }),
    id: t.string({ description: 'Identifier of the address' }),
  }),
  output: addressRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      personId: { type: 'string', description: 'Identifier of the person' },
      id: { type: 'string', description: 'Identifier of the address' },
    },
    required: ['personId', 'id'],
    additionalProperties: false,
  },
}

const appMakeOperation: OperationDescriptor<
  {
    readonly new: string
    readonly at?: string | undefined
    readonly withData?: unknown
    readonly withProperties?: unknown
  },
  undefined
> = {
  id: 'contacts.app.make',
  permission: 'contacts:app:make',
  target: { command: 'make' },
  description: 'Create a new object.',
  input: t.record({
    new: t.string({ description: 'The class of the new object.' }),
    at: t.optional(t.string({ description: 'The location at which to insert the object.' })),
    withData: t.optional(t.unknown({ description: 'The initial contents of the object.' })),
    withProperties: t.optional(
      t.unknown({ description: 'The initial values for properties of the object.' })
    ),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      new: { type: 'string', description: 'The class of the new object.' },
      at: { type: 'string', description: 'The location at which to insert the object.' },
      withData: {
        allOf: [
          { description: 'The initial contents of the object.', $ref: '#/definitions/__schema0' },
        ],
      },
      withProperties: {
        allOf: [
          {
            description: 'The initial values for properties of the object.',
            $ref: '#/definitions/__schema0',
          },
        ],
      },
    },
    required: ['new'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const appAddOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'contacts.app.add',
  permission: 'contacts:app:add',
  target: { command: 'add' },
  description: 'Add a child object.',
  input: t.record({
    to: t.string({ description: 'where to add this child to.' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'where to add this child to.' } },
    required: ['to'],
    additionalProperties: false,
  },
}

const appRemoveOperation: OperationDescriptor<{ readonly from: string }, undefined> = {
  id: 'contacts.app.remove',
  permission: 'contacts:app:remove',
  target: { command: 'remove' },
  description: 'Remove a child object.',
  input: t.record({
    from: t.string({ description: 'where to remove this child from.' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { from: { type: 'string', description: 'where to remove this child from.' } },
    required: ['from'],
    additionalProperties: false,
  },
}

const appSaveOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'contacts.app.save',
  permission: 'contacts:app:save',
  target: { command: 'save' },
  description:
    'Save all Contacts changes. Also see the unsaved property for the application class.',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appActionPropertyOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'contacts.app.actionProperty',
  permission: 'contacts:app:actionProperty',
  target: { command: 'actionProperty' },
  description:
    'RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appActionTitleOperation: OperationDescriptor<
  { readonly with: unknown; readonly for: ObjectReferenceData<string, 'Person'> },
  undefined
> = {
  id: 'contacts.app.actionTitle',
  permission: 'contacts:app:actionTitle',
  target: { command: 'actionTitle' },
  description: 'RollOver - Returns the title that will be placed in the menu for this roll over',
  input: t.record({
    with: t.unknown({
      description: 'property that that was returned from the "action property" handler.',
    }),
    for: t.reference<Person, string, 'Person'>(() => contactsContract, 'Person', 'one', {
      description: 'Currently selected person.',
    }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      with: {
        description: 'property that that was returned from the "action property" handler.',
        $ref: '#/definitions/__schema0',
      },
      for: {
        description: 'Currently selected person.',
        type: 'object',
        properties: {
          reference: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  resource: { type: 'string', const: 'Person' },
                  form: { type: 'string', const: 'identity' },
                  cardinality: { type: 'string', const: 'one' },
                  id: {
                    type: 'string',
                    description: 'Unique and persistent identifier for this record.',
                  },
                  container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
                },
                required: ['resource', 'form', 'cardinality', 'id'],
                additionalProperties: false,
              },
              {
                type: 'object',
                properties: {
                  resource: { type: 'string', const: 'Person' },
                  form: { type: 'string', const: 'selector' },
                  cardinality: { type: 'string', const: 'one' },
                  selector: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          by: { type: 'string', const: 'name' },
                          name: { type: 'string' },
                        },
                        required: ['by', 'name'],
                        additionalProperties: false,
                      },
                      {
                        type: 'object',
                        properties: {
                          by: { type: 'string', const: 'index' },
                          index: {
                            type: 'object',
                            properties: {
                              integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
                            },
                            required: ['integer'],
                            additionalProperties: false,
                          },
                        },
                        required: ['by', 'index'],
                        additionalProperties: false,
                      },
                    ],
                  },
                  container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
                },
                required: ['resource', 'form', 'cardinality', 'selector'],
                additionalProperties: false,
              },
            ],
          },
        },
        required: ['reference'],
        additionalProperties: false,
      },
    },
    required: ['with', 'for'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
      __schema1: {
        anyOf: [
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Address' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'unique identifier for this address.' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Email' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this email' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Group' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Person' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Phone' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this phone' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', enum: ['Address', 'Email', 'Group', 'Person', 'Phone'] },
              form: { type: 'string', const: 'selector' },
              cardinality: { type: 'string', const: 'one' },
              selector: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { by: { type: 'string', const: 'name' }, name: { type: 'string' } },
                    required: ['by', 'name'],
                    additionalProperties: false,
                  },
                  {
                    type: 'object',
                    properties: {
                      by: { type: 'string', const: 'index' },
                      index: {
                        type: 'object',
                        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
                        required: ['integer'],
                        additionalProperties: false,
                      },
                    },
                    required: ['by', 'index'],
                    additionalProperties: false,
                  },
                ],
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'selector'],
            additionalProperties: false,
          },
        ],
      },
      __schema2: {
        anyOf: [
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Address' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'unique identifier for this address.' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Email' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this email' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Group' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Person' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Phone' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this phone' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', enum: ['Address', 'Email', 'Group', 'Person', 'Phone'] },
              form: { type: 'string', const: 'selector' },
              cardinality: { type: 'string', const: 'one' },
              selector: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { by: { type: 'string', const: 'name' }, name: { type: 'string' } },
                    required: ['by', 'name'],
                    additionalProperties: false,
                  },
                  {
                    type: 'object',
                    properties: {
                      by: { type: 'string', const: 'index' },
                      index: {
                        type: 'object',
                        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
                        required: ['integer'],
                        additionalProperties: false,
                      },
                    },
                    required: ['by', 'index'],
                    additionalProperties: false,
                  },
                ],
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'selector'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const appPerformActionOperation: OperationDescriptor<
  { readonly with: unknown; readonly for: ObjectReferenceData<string, 'Person'> },
  undefined
> = {
  id: 'contacts.app.performAction',
  permission: 'contacts:app:performAction',
  target: { command: 'performAction' },
  description: 'RollOver - Performs the action on the given person and value',
  input: t.record({
    with: t.unknown({
      description: 'property that that was returned from the "action property" handler.',
    }),
    for: t.reference<Person, string, 'Person'>(() => contactsContract, 'Person', 'one', {
      description: 'Currently selected person.',
    }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      with: {
        description: 'property that that was returned from the "action property" handler.',
        $ref: '#/definitions/__schema0',
      },
      for: {
        description: 'Currently selected person.',
        type: 'object',
        properties: {
          reference: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  resource: { type: 'string', const: 'Person' },
                  form: { type: 'string', const: 'identity' },
                  cardinality: { type: 'string', const: 'one' },
                  id: {
                    type: 'string',
                    description: 'Unique and persistent identifier for this record.',
                  },
                  container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
                },
                required: ['resource', 'form', 'cardinality', 'id'],
                additionalProperties: false,
              },
              {
                type: 'object',
                properties: {
                  resource: { type: 'string', const: 'Person' },
                  form: { type: 'string', const: 'selector' },
                  cardinality: { type: 'string', const: 'one' },
                  selector: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          by: { type: 'string', const: 'name' },
                          name: { type: 'string' },
                        },
                        required: ['by', 'name'],
                        additionalProperties: false,
                      },
                      {
                        type: 'object',
                        properties: {
                          by: { type: 'string', const: 'index' },
                          index: {
                            type: 'object',
                            properties: {
                              integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
                            },
                            required: ['integer'],
                            additionalProperties: false,
                          },
                        },
                        required: ['by', 'index'],
                        additionalProperties: false,
                      },
                    ],
                  },
                  container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
                },
                required: ['resource', 'form', 'cardinality', 'selector'],
                additionalProperties: false,
              },
            ],
          },
        },
        required: ['reference'],
        additionalProperties: false,
      },
    },
    required: ['with', 'for'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
      __schema1: {
        anyOf: [
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Address' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'unique identifier for this address.' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Email' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this email' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Group' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Person' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Phone' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this phone' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', enum: ['Address', 'Email', 'Group', 'Person', 'Phone'] },
              form: { type: 'string', const: 'selector' },
              cardinality: { type: 'string', const: 'one' },
              selector: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { by: { type: 'string', const: 'name' }, name: { type: 'string' } },
                    required: ['by', 'name'],
                    additionalProperties: false,
                  },
                  {
                    type: 'object',
                    properties: {
                      by: { type: 'string', const: 'index' },
                      index: {
                        type: 'object',
                        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
                        required: ['integer'],
                        additionalProperties: false,
                      },
                    },
                    required: ['by', 'index'],
                    additionalProperties: false,
                  },
                ],
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'selector'],
            additionalProperties: false,
          },
        ],
      },
      __schema2: {
        anyOf: [
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Address' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'unique identifier for this address.' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Email' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this email' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Group' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Person' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Phone' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this phone' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', enum: ['Address', 'Email', 'Group', 'Person', 'Phone'] },
              form: { type: 'string', const: 'selector' },
              cardinality: { type: 'string', const: 'one' },
              selector: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { by: { type: 'string', const: 'name' }, name: { type: 'string' } },
                    required: ['by', 'name'],
                    additionalProperties: false,
                  },
                  {
                    type: 'object',
                    properties: {
                      by: { type: 'string', const: 'index' },
                      index: {
                        type: 'object',
                        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
                        required: ['integer'],
                        additionalProperties: false,
                      },
                    },
                    required: ['by', 'index'],
                    additionalProperties: false,
                  },
                ],
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'selector'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

const appShouldEnableActionOperation: OperationDescriptor<
  { readonly with: unknown; readonly for: ObjectReferenceData<string, 'Person'> },
  undefined
> = {
  id: 'contacts.app.shouldEnableAction',
  permission: 'contacts:app:shouldEnableAction',
  target: { command: 'shouldEnableAction' },
  description:
    'RollOver - Determines if the rollover action should be enabled for the given person and value',
  input: t.record({
    with: t.unknown({
      description: 'property that that was returned from the "action property" handler.',
    }),
    for: t.reference<Person, string, 'Person'>(() => contactsContract, 'Person', 'one', {
      description: 'Currently selected person.',
    }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      with: {
        description: 'property that that was returned from the "action property" handler.',
        $ref: '#/definitions/__schema0',
      },
      for: {
        description: 'Currently selected person.',
        type: 'object',
        properties: {
          reference: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  resource: { type: 'string', const: 'Person' },
                  form: { type: 'string', const: 'identity' },
                  cardinality: { type: 'string', const: 'one' },
                  id: {
                    type: 'string',
                    description: 'Unique and persistent identifier for this record.',
                  },
                  container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
                },
                required: ['resource', 'form', 'cardinality', 'id'],
                additionalProperties: false,
              },
              {
                type: 'object',
                properties: {
                  resource: { type: 'string', const: 'Person' },
                  form: { type: 'string', const: 'selector' },
                  cardinality: { type: 'string', const: 'one' },
                  selector: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          by: { type: 'string', const: 'name' },
                          name: { type: 'string' },
                        },
                        required: ['by', 'name'],
                        additionalProperties: false,
                      },
                      {
                        type: 'object',
                        properties: {
                          by: { type: 'string', const: 'index' },
                          index: {
                            type: 'object',
                            properties: {
                              integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
                            },
                            required: ['integer'],
                            additionalProperties: false,
                          },
                        },
                        required: ['by', 'index'],
                        additionalProperties: false,
                      },
                    ],
                  },
                  container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
                },
                required: ['resource', 'form', 'cardinality', 'selector'],
                additionalProperties: false,
              },
            ],
          },
        },
        required: ['reference'],
        additionalProperties: false,
      },
    },
    required: ['with', 'for'],
    additionalProperties: false,
    definitions: {
      __schema0: {
        anyOf: [
          { type: 'string' },
          { type: 'boolean' },
          { type: 'null' },
          { type: 'array', items: { $ref: '#/definitions/__schema0' } },
          {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              double: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
                ],
              },
            },
            required: ['double'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                pattern:
                  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
              },
            },
            required: ['date'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              record: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { $ref: '#/definitions/__schema0' },
              },
            },
            required: ['record'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { reference: { not: {} } },
            required: ['reference'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { file: { not: {} } },
            required: ['file'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { fileSource: { not: {} } },
            required: ['fileSource'],
            additionalProperties: false,
          },
        ],
      },
      __schema1: {
        anyOf: [
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Address' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'unique identifier for this address.' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Email' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this email' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Group' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Person' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Phone' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this phone' },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', enum: ['Address', 'Email', 'Group', 'Person', 'Phone'] },
              form: { type: 'string', const: 'selector' },
              cardinality: { type: 'string', const: 'one' },
              selector: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { by: { type: 'string', const: 'name' }, name: { type: 'string' } },
                    required: ['by', 'name'],
                    additionalProperties: false,
                  },
                  {
                    type: 'object',
                    properties: {
                      by: { type: 'string', const: 'index' },
                      index: {
                        type: 'object',
                        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
                        required: ['integer'],
                        additionalProperties: false,
                      },
                    },
                    required: ['by', 'index'],
                    additionalProperties: false,
                  },
                ],
              },
              container: { allOf: [{ $ref: '#/definitions/__schema1' }] },
            },
            required: ['resource', 'form', 'cardinality', 'selector'],
            additionalProperties: false,
          },
        ],
      },
      __schema2: {
        anyOf: [
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Address' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'unique identifier for this address.' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Email' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this email' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Group' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Person' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: {
                type: 'string',
                description: 'Unique and persistent identifier for this record.',
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', const: 'Phone' },
              form: { type: 'string', const: 'identity' },
              cardinality: { type: 'string', const: 'one' },
              id: { type: 'string', description: 'Unique identifier for this phone' },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'id'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              resource: { type: 'string', enum: ['Address', 'Email', 'Group', 'Person', 'Phone'] },
              form: { type: 'string', const: 'selector' },
              cardinality: { type: 'string', const: 'one' },
              selector: {
                oneOf: [
                  {
                    type: 'object',
                    properties: { by: { type: 'string', const: 'name' }, name: { type: 'string' } },
                    required: ['by', 'name'],
                    additionalProperties: false,
                  },
                  {
                    type: 'object',
                    properties: {
                      by: { type: 'string', const: 'index' },
                      index: {
                        type: 'object',
                        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
                        required: ['integer'],
                        additionalProperties: false,
                      },
                    },
                    required: ['by', 'index'],
                    additionalProperties: false,
                  },
                ],
              },
              container: { allOf: [{ $ref: '#/definitions/__schema2' }] },
            },
            required: ['resource', 'form', 'cardinality', 'selector'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ContactsClient>['operations'] = {
  'contacts.people.list': personListPeopleOperation,
  'contacts.people.get': personGetPersonOperation,
  'contacts.groups.list': groupListGroupsOperation,
  'contacts.groups.get': groupGetGroupOperation,
  'contacts.emails.list': emailListEmailsOperation,
  'contacts.emails.get': emailGetEmailOperation,
  'contacts.phones.list': phoneListPhonesOperation,
  'contacts.phones.get': phoneGetPhoneOperation,
  'contacts.addresses.list': addressListAddressesOperation,
  'contacts.addresses.get': addressGetAddressOperation,
  'contacts.app.make': appMakeOperation,
  'contacts.app.add': appAddOperation,
  'contacts.app.remove': appRemoveOperation,
  'contacts.app.save': appSaveOperation,
  'contacts.app.actionProperty': appActionPropertyOperation,
  'contacts.app.actionTitle': appActionTitleOperation,
  'contacts.app.performAction': appPerformActionOperation,
  'contacts.app.shouldEnableAction': appShouldEnableActionOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): ContactsClient {
  return {
    addresses: {
      list: (personId, options) =>
        runtime.invoke(addressListAddressesOperation, { personId }, options),
      get: (personId, id, options) =>
        runtime.invoke(addressGetAddressOperation, { personId, id }, options),
    },
    emails: {
      list: (personId, options) => runtime.invoke(emailListEmailsOperation, { personId }, options),
      get: (personId, id, options) =>
        runtime.invoke(emailGetEmailOperation, { personId, id }, options),
    },
    groups: {
      list: (options) => runtime.invoke(groupListGroupsOperation, {}, options),
      get: (id, options) => runtime.invoke(groupGetGroupOperation, { id }, options),
    },
    people: {
      list: (options) => runtime.invoke(personListPeopleOperation, {}, options),
      get: (id, options) => runtime.invoke(personGetPersonOperation, { id }, options),
    },
    phones: {
      list: (personId, options) => runtime.invoke(phoneListPhonesOperation, { personId }, options),
      get: (personId, id, options) =>
        runtime.invoke(phoneGetPhoneOperation, { personId, id }, options),
    },
    make: (_new, at, withData, withProperties, options) =>
      runtime.invoke(appMakeOperation, { new: _new, at, withData, withProperties }, options),
    add: (to, options) => runtime.invoke(appAddOperation, { to }, options),
    remove: (from, options) => runtime.invoke(appRemoveOperation, { from }, options),
    save: (options) => runtime.invoke(appSaveOperation, {}, options),
    actionProperty: (options) => runtime.invoke(appActionPropertyOperation, {}, options),
    actionTitle: (_with, _for, options) =>
      runtime.invoke(appActionTitleOperation, { with: _with, for: _for }, options),
    performAction: (_with, _for, options) =>
      runtime.invoke(appPerformActionOperation, { with: _with, for: _for }, options),
    shouldEnableAction: (_with, _for, options) =>
      runtime.invoke(appShouldEnableActionOperation, { with: _with, for: _for }, options),
  }
}

/**
 * The Contacts contract. Pass it to a client factory to obtain a
 * {@link ContactsClient}.
 */
export const contactsContract: AppContract<ContactsClient> = {
  app: 'contacts',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
