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
 * factory, local or remote, which supplies the runtime that `bind` turns into
 * a `ContactsClient`; application code changes locality by changing the factory,
 * not the contract.
 *
 * @example
 * ```ts
 * import { createClient } from '@macts/sdk'
 * import { contactsContract } from '@macts/contacts/contract'
 *
 * const client = createClient(contactsContract, { token, url })
 * ```
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
  type ObjectReferenceVariant,
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
  /** City part of the address. */
  city: string
  /** properly formatted string for this address. */
  readonly formattedAddress: string
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

/** User name for America Online (AOL) instant messaging. */
export interface AIMHandle {
  /** Unique identifier for this handle */
  readonly id: string
  /** Label for this handle */
  label: string
  /** The AIM handle value */
  value: string
}

/** Arbitrary date associated with this person. */
export interface CustomDate {
  /** Unique identifier for this date */
  readonly id: string
  /** Label for this date */
  label: string
  /** The date value */
  value: Date
}

/** Email address for a person. */
export interface Email {
  /** Unique identifier for this email */
  readonly id: string
  /** Label for this email */
  label: string
  /** The email address */
  value: string
}

/** A Group Record in the address book database */
export interface Group {
  /** The name of this group. */
  name: string
}

/** User name for ICQ instant messaging. */
export interface ICQHandle {
  /** Unique identifier for this handle */
  readonly id: string
  /** Label for this handle */
  label: string
  /** The ICQ handle value */
  value: string
}

/** Address for instant messaging. */
export interface InstantMessage {
  /** The service name of this instant message address. */
  readonly serviceName: string
  /** The service type of this instant message address. */
  serviceType: string
  /** The user name of this instant message address. */
  userName: string
}

/** User name for Jabber instant messaging. */
export interface JabberHandle {
  /** Unique identifier for this handle */
  readonly id: string
  /** Label for this handle */
  label: string
  /** The Jabber handle value */
  value: string
}

/** User name for Microsoft Network (MSN) instant messaging. */
export interface MSNHandle {
  /** Unique identifier for this handle */
  readonly id: string
  /** Label for this handle */
  label: string
  /** The MSN handle value */
  value: string
}

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
  readonly vcard: string
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
  readonly name: string
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

/** Phone number for a person. */
export interface Phone {
  /** Unique identifier for this phone */
  readonly id: string
  /** Label for this phone */
  label: string
  /** The phone number */
  value: string
}

/** Other names related to this person. */
export interface RelatedName {
  /** Unique identifier for this name */
  readonly id: string
  /** Label for this name */
  label: string
  /** The related name value */
  value: string
}

/** Profile for social networks. */
export interface SocialProfile {
  /** The persistent unique identifier for this profile. */
  readonly id: string
  /** The service name of this social profile. */
  serviceName: string
  /** The username used with this social profile. */
  userName: string
  /** A service-specific identifier used with this social profile. */
  userIdentifier: string
  /** The URL of this social profile. */
  url: string
}

/** URLs for this person. */
export interface Url {
  /** Unique identifier for this URL */
  readonly id: string
  /** Label for this URL */
  label: string
  /** The URL value */
  value: string
}

/** User name for Yahoo instant messaging. */
export interface YahooHandle {
  /** Unique identifier for this handle */
  readonly id: string
  /** Label for this handle */
  label: string
  /** The Yahoo handle value */
  value: string
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

/** Input for creating an AIMHandle. */
export interface AIMHandleCreateInput {
  /** Label for this handle */
  label?: string
  /** The AIM handle value */
  value?: string
}

/** Input for updating an AIMHandle. Omitted fields are left unchanged. */
export interface AIMHandleUpdateInput {
  /** Label for this handle */
  label?: string
  /** The AIM handle value */
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
  /** Label for this date */
  label?: string
  /** The date value */
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
  /** Label for this email */
  label?: string
  /** The email address */
  value?: string
}

/** Input for creating a Group. */
export interface GroupCreateInput {
  /** The name of this group. */
  name?: string
}

/** Input for updating a Group. Omitted fields are left unchanged. */
export interface GroupUpdateInput {
  /** The name of this group. */
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
  /** Label for this handle */
  label?: string
  /** The ICQ handle value */
  value?: string
}

/** Input for creating an InstantMessage. */
export interface InstantMessageCreateInput {
  /** The service type of this instant message address. */
  serviceType?: string
  /** The user name of this instant message address. */
  userName?: string
}

/** Input for updating an InstantMessage. Omitted fields are left unchanged. */
export interface InstantMessageUpdateInput {
  /** The service type of this instant message address. */
  serviceType?: string
  /** The user name of this instant message address. */
  userName?: string
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
  /** Label for this handle */
  label?: string
  /** The Jabber handle value */
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
  /** Label for this handle */
  label?: string
  /** The MSN handle value */
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

/** Input for updating a Person. Omitted fields are left unchanged. */
export interface PersonUpdateInput {
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

/** Input for creating a Phone. */
export interface PhoneCreateInput {
  /** Label for this phone */
  label?: string
  /** The phone number */
  value?: string
}

/** Input for updating a Phone. Omitted fields are left unchanged. */
export interface PhoneUpdateInput {
  /** Label for this phone */
  label?: string
  /** The phone number */
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
  /** Label for this name */
  label?: string
  /** The related name value */
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
  /** The service name of this social profile. */
  serviceName?: string
  /** The username used with this social profile. */
  userName?: string
  /** A service-specific identifier used with this social profile. */
  userIdentifier?: string
  /** The URL of this social profile. */
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
  /** Label for this URL */
  label?: string
  /** The URL value */
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
  /** Label for this handle */
  label?: string
  /** The Yahoo handle value */
  value?: string
}

/**
 * The Contacts client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link contactsContract}.
 */
export interface ContactsClient {
  /** Create a new object. */
  make(
    _new: string,
    at?: string,
    withData?: unknown,
    withProperties?: unknown,
    options?: CallOptions
  ): Promise<void>
  /** Add a child object. */
  add(to: string, options?: CallOptions): Promise<void>
  /** Remove a child object. */
  remove(from: string, options?: CallOptions): Promise<void>
  /** Save all Contacts changes. Also see the unsaved property for the application class. */
  save(options?: CallOptions): Promise<void>
  /**
   * RollOver - Which property this roll over is associated with (Properties can be one of maiden
   * name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo,
   * address.)
   */
  actionProperty(options?: CallOptions): Promise<void>
  /** RollOver - Returns the title that will be placed in the menu for this roll over */
  actionTitle(
    _with: unknown,
    _for: ObjectReferenceVariant<Person, never>,
    options?: CallOptions
  ): Promise<void>
  /** RollOver - Performs the action on the given person and value */
  performAction(
    _with: unknown,
    _for: ObjectReferenceVariant<Person, never>,
    options?: CallOptions
  ): Promise<void>
  /**
   * RollOver - Determines if the rollover action should be enabled for the given person and value
   */
  shouldEnableAction(
    _with: unknown,
    _for: ObjectReferenceVariant<Person, never>,
    options?: CallOptions
  ): Promise<void>
}

const addressRecordType: ValueType<Address> = t.record(
  {
    city: t.string({ description: 'City part of the address.' }),
    formattedAddress: t.string({ description: 'properly formatted string for this address.' }),
    street: t.string({
      description: 'Street part of the address, multiple lines separated by carriage returns.',
    }),
    id: t.string({ description: 'unique identifier for this address.' }),
    zip: t.string({ description: 'Zip or postal code of the address.' }),
    country: t.string({ description: 'Country part of the address.' }),
    label: t.string({ description: 'Label.' }),
    countryCode: t.string({
      description: 'Country code part of the address (should be a two character iso country code).',
    }),
    state: t.string({ description: 'State, Province, or Region part of the address.' }),
  },
  { description: 'Address for the given record.' }
)

const aimHandleRecordType: ValueType<AIMHandle> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this handle' }),
    label: t.string({ description: 'Label for this handle' }),
    value: t.string({ description: 'The AIM handle value' }),
  },
  { description: 'User name for America Online (AOL) instant messaging.' }
)

const customDateRecordType: ValueType<CustomDate> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this date' }),
    label: t.string({ description: 'Label for this date' }),
    value: t.date({ description: 'The date value' }),
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
    name: t.string({ description: 'The name of this group.' }),
  },
  { description: 'A Group Record in the address book database' }
)

const icqHandleRecordType: ValueType<ICQHandle> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this handle' }),
    label: t.string({ description: 'Label for this handle' }),
    value: t.string({ description: 'The ICQ handle value' }),
  },
  { description: 'User name for ICQ instant messaging.' }
)

const instantMessageRecordType: ValueType<InstantMessage> = t.record(
  {
    serviceName: t.string({ description: 'The service name of this instant message address.' }),
    serviceType: t.string({ description: 'The service type of this instant message address.' }),
    userName: t.string({ description: 'The user name of this instant message address.' }),
  },
  { description: 'Address for instant messaging.' }
)

const jabberHandleRecordType: ValueType<JabberHandle> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this handle' }),
    label: t.string({ description: 'Label for this handle' }),
    value: t.string({ description: 'The Jabber handle value' }),
  },
  { description: 'User name for Jabber instant messaging.' }
)

const msnHandleRecordType: ValueType<MSNHandle> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this handle' }),
    label: t.string({ description: 'Label for this handle' }),
    value: t.string({ description: 'The MSN handle value' }),
  },
  { description: 'User name for Microsoft Network (MSN) instant messaging.' }
)

const personRecordType: ValueType<Person> = t.record(
  {
    nickname: t.string({ description: 'The Nickname of this person.' }),
    organization: t.string({ description: 'Organization that employs this person.' }),
    maidenName: t.string({ description: 'The Maiden name of this person.' }),
    suffix: t.string({ description: 'The Suffix of this person.' }),
    vcard: t.string({
      description:
        'Person information in vCard format, this always returns a card in version 3.0 format.',
    }),
    homePage: t.string({ description: 'The home page of this person.' }),
    birthDate: t.string({ description: 'The birth date of this person.' }),
    phoneticLastName: t.string({
      description: 'The phonetic version of the Last name of this person.',
    }),
    title: t.string({ description: 'The title of this person.' }),
    phoneticMiddleName: t.string({
      description: 'The Phonetic version of the Middle name of this person.',
    }),
    department: t.string({ description: 'Department that this person works for.' }),
    image: t.string({ description: 'Image for person.' }),
    name: t.string({
      description:
        'First/Last name of the person, uses the name display order preference setting in Contacts.',
    }),
    note: t.string({ description: 'Notes for this person.' }),
    company: t.boolean({ description: 'Is the current record a company or a person.' }),
    middleName: t.string({ description: 'The Middle name of this person.' }),
    phoneticFirstName: t.string({
      description: 'The phonetic version of the First name of this person.',
    }),
    jobTitle: t.string({ description: 'The job title of this person.' }),
    lastName: t.string({ description: 'The Last name of this person.' }),
    firstName: t.string({ description: 'The First name of this person.' }),
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
    id: t.string({ description: 'Unique identifier for this name' }),
    label: t.string({ description: 'Label for this name' }),
    value: t.string({ description: 'The related name value' }),
  },
  { description: 'Other names related to this person.' }
)

const socialProfileRecordType: ValueType<SocialProfile> = t.record(
  {
    id: t.string({ description: 'The persistent unique identifier for this profile.' }),
    serviceName: t.string({ description: 'The service name of this social profile.' }),
    userName: t.string({ description: 'The username used with this social profile.' }),
    userIdentifier: t.string({
      description: 'A service-specific identifier used with this social profile.',
    }),
    url: t.string({ description: 'The URL of this social profile.' }),
  },
  { description: 'Profile for social networks.' }
)

const urlRecordType: ValueType<Url> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this URL' }),
    label: t.string({ description: 'Label for this URL' }),
    value: t.string({ description: 'The URL value' }),
  },
  { description: 'URLs for this person.' }
)

const yahooHandleRecordType: ValueType<YahooHandle> = t.record(
  {
    id: t.string({ description: 'Unique identifier for this handle' }),
    label: t.string({ description: 'Label for this handle' }),
    value: t.string({ description: 'The Yahoo handle value' }),
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
  },
  Group: {
    name: 'Group',
    record: groupRecordType,
  },
  ICQHandle: {
    name: 'ICQHandle',
    record: icqHandleRecordType,
  },
  InstantMessage: {
    name: 'InstantMessage',
    record: instantMessageRecordType,
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
  },
  Phone: {
    name: 'Phone',
    record: phoneRecordType,
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
}

const appSaveOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'contacts.app.save',
  permission: 'contacts:app:save',
  target: { command: 'save' },
  description:
    'Save all Contacts changes. Also see the unsaved property for the application class.',
  input: t.record({}),
  output: t.none(),
}

const appActionPropertyOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'contacts.app.actionProperty',
  permission: 'contacts:app:actionProperty',
  target: { command: 'actionProperty' },
  description:
    'RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)',
  input: t.record({}),
  output: t.none(),
}

const appActionTitleOperation: OperationDescriptor<
  { readonly with: unknown; readonly for: ObjectReferenceVariant<Person, never> },
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
    for: t.reference<Person, never>(() => resources, 'Person', 'one', {
      description: 'Currently selected person.',
    }),
  }),
  output: t.none(),
}

const appPerformActionOperation: OperationDescriptor<
  { readonly with: unknown; readonly for: ObjectReferenceVariant<Person, never> },
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
    for: t.reference<Person, never>(() => resources, 'Person', 'one', {
      description: 'Currently selected person.',
    }),
  }),
  output: t.none(),
}

const appShouldEnableActionOperation: OperationDescriptor<
  { readonly with: unknown; readonly for: ObjectReferenceVariant<Person, never> },
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
    for: t.reference<Person, never>(() => resources, 'Person', 'one', {
      description: 'Currently selected person.',
    }),
  }),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<ContactsClient>['operations'] = {
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
