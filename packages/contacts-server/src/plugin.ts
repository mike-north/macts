/**
 * API plugin for Contacts.app.
 *
 * Provides the manifest for registering RPC endpoints.
 *
 * @packageDocumentation
 */

import type { AppManifest } from '@macts/core';

/**
 * API plugin for Contacts.app.
 *
 * This plugin contains the app manifest and metadata needed by the @macts/api
 * server to auto-generate RPC endpoints for Contacts.app automation.
 */
export const contactsApiPlugin = {
  name: 'contacts',
  bundleId: 'com.apple.AddressBook',
  manifest: {
  "version": "1.0",
  "app": {
    "bundleId": "com.apple.AddressBook",
    "name": "Contacts",
    "displayName": "Contacts",
    "tccEntitlements": [
      "automation",
      "contacts"
    ],
    "distributionModel": "system"
  },
  "suites": [
    {
      "name": "Standard Suite",
      "description": "Common classes and commands for all applications.",
      "code": "????",
      "resources": [],
      "commands": [
        "make"
      ],
      "enums": []
    },
    {
      "name": "Contacts Script Suite",
      "description": "commands and classes for Contacts scripting.",
      "code": "az00",
      "resources": [
        "Address",
        "AIMHandle",
        "CustomDate",
        "Email",
        "Group",
        "ICQHandle",
        "InstantMessage",
        "JabberHandle",
        "MSNHandle",
        "Person",
        "Phone",
        "RelatedName",
        "SocialProfile",
        "Url",
        "YahooHandle"
      ],
      "commands": [
        "add",
        "remove",
        "save"
      ],
      "enums": [
        "SaveableFileFormat",
        "InstantMessageServiceType"
      ]
    },
    {
      "name": "Address Book Rollover Suite",
      "description": "These event definitions are used for constructing Address Book Rollover plug-ins. They would not normally appear in a typical end user script.",
      "code": "az99",
      "resources": [],
      "commands": [
        "actionProperty",
        "actionTitle",
        "performAction",
        "shouldEnableAction"
      ],
      "enums": []
    }
  ],
  "resources": {
    "Address": {
      "name": "Address",
      "plural": "Addresses",
      "description": "Address for the given record.",
      "code": "az27",
      "properties": {
        "city": {
          "access": "rw",
          "type": "string",
          "description": "City part of the address.",
          "code": "az29",
          "optional": false
        },
        "formattedAddress": {
          "access": "r",
          "type": "string",
          "description": "properly formatted string for this address.",
          "code": "az65",
          "optional": false
        },
        "street": {
          "access": "rw",
          "type": "string",
          "description": "Street part of the address, multiple lines separated by carriage returns.",
          "code": "az28",
          "optional": false
        },
        "id": {
          "access": "rw",
          "type": "string",
          "description": "unique identifier for this address.",
          "code": "ID  ",
          "optional": false
        },
        "zip": {
          "access": "rw",
          "type": "string",
          "description": "Zip or postal code of the address.",
          "code": "az31",
          "optional": false
        },
        "country": {
          "access": "rw",
          "type": "string",
          "description": "Country part of the address.",
          "code": "az32",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label.",
          "code": "az18",
          "optional": false
        },
        "countryCode": {
          "access": "rw",
          "type": "string",
          "description": "Country code part of the address (should be a two character iso country code).",
          "code": "az33",
          "optional": false
        },
        "state": {
          "access": "rw",
          "type": "string",
          "description": "State, Province, or Region part of the address.",
          "code": "az30",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "AIMHandle": {
      "name": "AIMHandle",
      "plural": "AIMHandles",
      "description": "User name for America Online (AOL) instant messaging.",
      "code": "az22",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this handle",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this handle",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The AIM handle value",
          "code": "valL",
          "optional": false
        }
      }
    },
    "CustomDate": {
      "name": "CustomDate",
      "plural": "CustomDates",
      "description": "Arbitrary date associated with this person.",
      "code": "az52",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this date",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this date",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "date",
          "description": "The date value",
          "code": "valL",
          "optional": false
        }
      }
    },
    "Email": {
      "name": "Email",
      "plural": "Emails",
      "description": "Email address for a person.",
      "code": "az21",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this email",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this email",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The email address",
          "code": "valL",
          "optional": false
        }
      }
    },
    "Group": {
      "name": "Group",
      "plural": "Groups",
      "description": "A Group Record in the address book database",
      "code": "azf5",
      "properties": {
        "name": {
          "access": "rw",
          "type": "string",
          "description": "The name of this group.",
          "code": "pnam",
          "optional": false
        }
      }
    },
    "ICQHandle": {
      "name": "ICQHandle",
      "plural": "ICQHandles",
      "description": "User name for ICQ instant messaging.",
      "code": "az26",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this handle",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this handle",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The ICQ handle value",
          "code": "valL",
          "optional": false
        }
      }
    },
    "InstantMessage": {
      "name": "InstantMessage",
      "plural": "InstantMessages",
      "description": "Address for instant messaging.",
      "code": "az80",
      "properties": {
        "serviceName": {
          "access": "r",
          "type": "string",
          "description": "The service name of this instant message address.",
          "code": "az81",
          "optional": false
        },
        "serviceType": {
          "access": "rw",
          "type": "string",
          "description": "The service type of this instant message address.",
          "code": "az82",
          "optional": false
        },
        "userName": {
          "access": "rw",
          "type": "string",
          "description": "The user name of this instant message address.",
          "code": "az83",
          "optional": false
        }
      }
    },
    "JabberHandle": {
      "name": "JabberHandle",
      "plural": "JabberHandles",
      "description": "User name for Jabber instant messaging.",
      "code": "az23",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this handle",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this handle",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The Jabber handle value",
          "code": "valL",
          "optional": false
        }
      }
    },
    "MSNHandle": {
      "name": "MSNHandle",
      "plural": "MSNHandles",
      "description": "User name for Microsoft Network (MSN) instant messaging.",
      "code": "az24",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this handle",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this handle",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The MSN handle value",
          "code": "valL",
          "optional": false
        }
      }
    },
    "Person": {
      "name": "Person",
      "plural": "People",
      "description": "A person in the address book database.",
      "code": "azf4",
      "properties": {
        "nickname": {
          "access": "rw",
          "type": "string",
          "description": "The Nickname of this person.",
          "code": "az43",
          "optional": false
        },
        "organization": {
          "access": "rw",
          "type": "string",
          "description": "Organization that employs this person.",
          "code": "az38",
          "optional": false
        },
        "maidenName": {
          "access": "rw",
          "type": "string",
          "description": "The Maiden name of this person.",
          "code": "az42",
          "optional": false
        },
        "suffix": {
          "access": "rw",
          "type": "string",
          "description": "The Suffix of this person.",
          "code": "az41",
          "optional": false
        },
        "vcard": {
          "access": "r",
          "type": "string",
          "description": "Person information in vCard format, this always returns a card in version 3.0 format.",
          "code": "az49",
          "optional": false
        },
        "homePage": {
          "access": "rw",
          "type": "string",
          "description": "The home page of this person.",
          "code": "az13",
          "optional": false
        },
        "birthDate": {
          "access": "rw",
          "type": "string",
          "description": "The birth date of this person.",
          "code": "az11",
          "optional": false
        },
        "phoneticLastName": {
          "access": "rw",
          "type": "string",
          "description": "The phonetic version of the Last name of this person.",
          "code": "az10",
          "optional": false
        },
        "title": {
          "access": "rw",
          "type": "string",
          "description": "The title of this person.",
          "code": "az39",
          "optional": false
        },
        "phoneticMiddleName": {
          "access": "rw",
          "type": "string",
          "description": "The Phonetic version of the Middle name of this person.",
          "code": "az56",
          "optional": false
        },
        "department": {
          "access": "rw",
          "type": "string",
          "description": "Department that this person works for.",
          "code": "az55",
          "optional": false
        },
        "image": {
          "access": "rw",
          "type": "string",
          "description": "Image for person.",
          "code": "az50",
          "optional": false
        },
        "name": {
          "access": "r",
          "type": "string",
          "description": "First/Last name of the person, uses the name display order preference setting in Contacts.",
          "code": "pnam",
          "optional": false
        },
        "note": {
          "access": "rw",
          "type": "string",
          "description": "Notes for this person.",
          "code": "az37",
          "optional": false
        },
        "company": {
          "access": "rw",
          "type": "boolean",
          "description": "Is the current record a company or a person.",
          "code": "az51",
          "optional": false
        },
        "middleName": {
          "access": "rw",
          "type": "string",
          "description": "The Middle name of this person.",
          "code": "az40",
          "optional": false
        },
        "phoneticFirstName": {
          "access": "rw",
          "type": "string",
          "description": "The phonetic version of the First name of this person.",
          "code": "azf9",
          "optional": false
        },
        "jobTitle": {
          "access": "rw",
          "type": "string",
          "description": "The job title of this person.",
          "code": "az12",
          "optional": false
        },
        "lastName": {
          "access": "rw",
          "type": "string",
          "description": "The Last name of this person.",
          "code": "azf8",
          "optional": false
        },
        "firstName": {
          "access": "rw",
          "type": "string",
          "description": "The First name of this person.",
          "code": "azf7",
          "optional": false
        }
      }
    },
    "Phone": {
      "name": "Phone",
      "plural": "Phones",
      "description": "Phone number for a person.",
      "code": "az20",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this phone",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this phone",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The phone number",
          "code": "valL",
          "optional": false
        }
      }
    },
    "RelatedName": {
      "name": "RelatedName",
      "plural": "RelatedNames",
      "description": "Other names related to this person.",
      "code": "az53",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this name",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this name",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The related name value",
          "code": "valL",
          "optional": false
        }
      }
    },
    "SocialProfile": {
      "name": "SocialProfile",
      "plural": "SocialProfiles",
      "description": "Profile for social networks.",
      "code": "sp01",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "The persistent unique identifier for this profile.",
          "code": "ID  ",
          "optional": false
        },
        "serviceName": {
          "access": "rw",
          "type": "string",
          "description": "The service name of this social profile.",
          "code": "az81",
          "optional": false
        },
        "userName": {
          "access": "rw",
          "type": "string",
          "description": "The username used with this social profile.",
          "code": "az83",
          "optional": false
        },
        "userIdentifier": {
          "access": "rw",
          "type": "string",
          "description": "A service-specific identifier used with this social profile.",
          "code": "spid",
          "optional": false
        },
        "url": {
          "access": "rw",
          "type": "string",
          "description": "The URL of this social profile.",
          "code": "spur",
          "optional": false
        }
      },
      "identifiers": [
        {
          "property": "id",
          "primary": true
        }
      ]
    },
    "Url": {
      "name": "Url",
      "plural": "Urls",
      "description": "URLs for this person.",
      "code": "az70",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this URL",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this URL",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The URL value",
          "code": "valL",
          "optional": false
        }
      }
    },
    "YahooHandle": {
      "name": "YahooHandle",
      "plural": "YahooHandles",
      "description": "User name for Yahoo instant messaging.",
      "code": "az25",
      "properties": {
        "id": {
          "access": "r",
          "type": "string",
          "description": "Unique identifier for this handle",
          "code": "ID  ",
          "optional": false
        },
        "label": {
          "access": "rw",
          "type": "string",
          "description": "Label for this handle",
          "code": "az18",
          "optional": false
        },
        "value": {
          "access": "rw",
          "type": "string",
          "description": "The Yahoo handle value",
          "code": "valL",
          "optional": false
        }
      }
    }
  },
  "enums": {
    "SaveableFileFormat": {
      "name": "SaveableFileFormat",
      "code": "savf",
      "values": [
        {
          "name": "archive",
          "value": "archive",
          "description": "The native Contacts file format",
          "code": "abbu"
        }
      ]
    },
    "InstantMessageServiceType": {
      "name": "InstantMessageServiceType",
      "code": "az84",
      "values": [
        {
          "name": "aIM",
          "value": "aIM",
          "code": "az85"
        },
        {
          "name": "facebook",
          "value": "facebook",
          "code": "az94"
        },
        {
          "name": "gaduGadu",
          "value": "gaduGadu",
          "code": "az86"
        },
        {
          "name": "googleTalk",
          "value": "googleTalk",
          "code": "az87"
        },
        {
          "name": "iCQ",
          "value": "iCQ",
          "code": "az88"
        },
        {
          "name": "jabber",
          "value": "jabber",
          "code": "az89"
        },
        {
          "name": "mSN",
          "value": "mSN",
          "code": "az90"
        },
        {
          "name": "qQ",
          "value": "qQ",
          "code": "az91"
        },
        {
          "name": "skype",
          "value": "skype",
          "code": "az92"
        },
        {
          "name": "yahoo",
          "value": "yahoo",
          "code": "az93"
        }
      ]
    }
  },
  "hierarchy": {
    "children": {
      "groups": {
        "resource": "Group",
        "access": "rw",
        "description": "A Group Record in the address book database",
        "children": {
          "people": {
            "resource": "Person",
            "access": "r",
            "description": "A person in the address book database.",
            "children": {
              "mSNHandles": {
                "resource": "MSNHandle",
                "access": "rw",
                "description": "User name for Microsoft Network (MSN) instant messaging."
              },
              "urls": {
                "resource": "Url",
                "access": "rw",
                "description": "URLs for this person."
              },
              "addresses": {
                "resource": "Address",
                "access": "rw",
                "description": "Address for the given record."
              },
              "phones": {
                "resource": "Phone",
                "access": "rw",
                "description": "Phone number for a person."
              },
              "jabberHandles": {
                "resource": "JabberHandle",
                "access": "rw",
                "description": "User name for Jabber instant messaging."
              },
              "customDates": {
                "resource": "CustomDate",
                "access": "rw",
                "description": "Arbitrary date associated with this person."
              },
              "aIMHandles": {
                "resource": "AIMHandle",
                "access": "rw",
                "description": "User name for America Online (AOL) instant messaging."
              },
              "yahooHandles": {
                "resource": "YahooHandle",
                "access": "rw",
                "description": "User name for Yahoo instant messaging."
              },
              "iCQHandles": {
                "resource": "ICQHandle",
                "access": "rw",
                "description": "User name for ICQ instant messaging."
              },
              "instantMessages": {
                "resource": "InstantMessage",
                "access": "rw",
                "description": "Address for instant messaging."
              },
              "socialProfiles": {
                "resource": "SocialProfile",
                "access": "rw",
                "description": "Profile for social networks."
              },
              "relatedNames": {
                "resource": "RelatedName",
                "access": "rw",
                "description": "Other names related to this person."
              },
              "emails": {
                "resource": "Email",
                "access": "rw",
                "description": "Email address for a person."
              }
            }
          }
        }
      },
      "people": {
        "resource": "Person",
        "access": "rw",
        "description": "A person in the address book database.",
        "children": {
          "mSNHandles": {
            "resource": "MSNHandle",
            "access": "rw",
            "description": "User name for Microsoft Network (MSN) instant messaging."
          },
          "urls": {
            "resource": "Url",
            "access": "rw",
            "description": "URLs for this person."
          },
          "addresses": {
            "resource": "Address",
            "access": "rw",
            "description": "Address for the given record."
          },
          "phones": {
            "resource": "Phone",
            "access": "rw",
            "description": "Phone number for a person."
          },
          "jabberHandles": {
            "resource": "JabberHandle",
            "access": "rw",
            "description": "User name for Jabber instant messaging."
          },
          "groups": {
            "resource": "Group",
            "access": "r",
            "description": "A Group Record in the address book database"
          },
          "customDates": {
            "resource": "CustomDate",
            "access": "rw",
            "description": "Arbitrary date associated with this person."
          },
          "aIMHandles": {
            "resource": "AIMHandle",
            "access": "rw",
            "description": "User name for America Online (AOL) instant messaging."
          },
          "yahooHandles": {
            "resource": "YahooHandle",
            "access": "rw",
            "description": "User name for Yahoo instant messaging."
          },
          "iCQHandles": {
            "resource": "ICQHandle",
            "access": "rw",
            "description": "User name for ICQ instant messaging."
          },
          "instantMessages": {
            "resource": "InstantMessage",
            "access": "rw",
            "description": "Address for instant messaging."
          },
          "socialProfiles": {
            "resource": "SocialProfile",
            "access": "rw",
            "description": "Profile for social networks."
          },
          "relatedNames": {
            "resource": "RelatedName",
            "access": "rw",
            "description": "Other names related to this person."
          },
          "emails": {
            "resource": "Email",
            "access": "rw",
            "description": "Email address for a person."
          }
        }
      }
    }
  },
  "relationships": [],
  "commands": {
    "make": {
      "name": "make",
      "description": "Create a new object.",
      "scope": "application",
      "parameters": [
        {
          "name": "new",
          "type": "string",
          "description": "The class of the new object.",
          "required": true,
          "code": "kocl"
        },
        {
          "name": "at",
          "type": "string",
          "description": "The location at which to insert the object.",
          "required": false,
          "code": "insh"
        },
        {
          "name": "withData",
          "type": "any",
          "description": "The initial contents of the object.",
          "required": false,
          "code": "data"
        },
        {
          "name": "withProperties",
          "type": "any",
          "description": "The initial values for properties of the object.",
          "required": false,
          "code": "prdt"
        }
      ],
      "code": "crel"
    },
    "add": {
      "name": "add",
      "description": "Add a child object.",
      "scope": "application",
      "parameters": [
        {
          "name": "to",
          "type": "string",
          "description": "where to add this child to.",
          "required": true,
          "code": "az45"
        }
      ],
      "code": "az44"
    },
    "remove": {
      "name": "remove",
      "description": "Remove a child object.",
      "scope": "application",
      "parameters": [
        {
          "name": "from",
          "type": "string",
          "description": "where to remove this child from.",
          "required": true,
          "code": "az47"
        }
      ],
      "code": "az46"
    },
    "save": {
      "name": "save",
      "description": "Save all Contacts changes. Also see the unsaved property for the application class.",
      "scope": "application",
      "parameters": [],
      "code": "save"
    },
    "actionProperty": {
      "name": "actionProperty",
      "description": "RollOver - Which property this roll over is associated with (Properties can be one of maiden name, phone, email, url, birth date, custom date, related name, aim, icq, jabber, msn, yahoo, address.)",
      "scope": "application",
      "parameters": [],
      "code": "az57"
    },
    "actionTitle": {
      "name": "actionTitle",
      "description": "RollOver - Returns the title that will be placed in the menu for this roll over",
      "scope": "application",
      "parameters": [
        {
          "name": "with",
          "type": "any",
          "description": "property that that was returned from the \"action property\" handler.",
          "required": true,
          "code": "az62"
        },
        {
          "name": "for",
          "type": {
            "resource": "person"
          },
          "description": "Currently selected person.",
          "required": true,
          "code": "az61"
        }
      ],
      "code": "az58"
    },
    "performAction": {
      "name": "performAction",
      "description": "RollOver - Performs the action on the given person and value",
      "scope": "application",
      "parameters": [
        {
          "name": "with",
          "type": "any",
          "description": "property that that was returned from the \"action property\" handler.",
          "required": true,
          "code": "az62"
        },
        {
          "name": "for",
          "type": {
            "resource": "person"
          },
          "description": "Currently selected person.",
          "required": true,
          "code": "az61"
        }
      ],
      "code": "az60"
    },
    "shouldEnableAction": {
      "name": "shouldEnableAction",
      "description": "RollOver - Determines if the rollover action should be enabled for the given person and value",
      "scope": "application",
      "parameters": [
        {
          "name": "with",
          "type": "any",
          "description": "property that that was returned from the \"action property\" handler.",
          "required": true,
          "code": "az62"
        },
        {
          "name": "for",
          "type": {
            "resource": "person"
          },
          "description": "Currently selected person.",
          "required": true,
          "code": "az61"
        }
      ],
      "code": "az59"
    }
  }
} as AppManifest,
} as const;
