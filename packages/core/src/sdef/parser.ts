/**
 * SDEF XML parser - converts Apple Event terminology XML to structured data.
 * @module sdef/parser
 */

import { XMLParser } from 'fast-xml-parser';
import type {
  RawSdefData,
  RawSuite,
  RawClass,
  RawProperty,
  RawElement,
  RawCommand,
  RawParameter,
  RawEnumeration,
  RawEnumerator,
} from './types.js';

/**
 * Types for raw XML parsed data from fast-xml-parser.
 * These represent the untyped structure coming from the XML before validation.
 */

/** Raw XML description element (can be string or object with _text) */
interface XmlDescription {
  _text?: string;
}

/** Raw XML property element */
interface XmlProperty {
  name?: string;
  code?: string;
  type?: string;
  access?: string;
  description?: string | XmlDescription;
  hidden?: string;
}

/** Raw XML element (containment) element */
interface XmlElement {
  type?: string;
  access?: string;
}

/** Raw XML class element */
interface XmlClass {
  name?: string;
  code?: string;
  plural?: string;
  inherits?: string;
  description?: string | XmlDescription;
  hidden?: string;
  property?: XmlProperty | XmlProperty[];
  element?: XmlElement | XmlElement[];
}

/** Raw XML parameter element */
interface XmlParameter {
  name?: string;
  code?: string;
  type?: string;
  description?: string | XmlDescription;
  optional?: string;
}

/** Raw XML direct parameter or result element */
interface XmlDirectParameterOrResult {
  type?: string;
  description?: string | XmlDescription;
}

/** Raw XML command element */
interface XmlCommand {
  name?: string;
  code?: string;
  description?: string | XmlDescription;
  'direct-parameter'?: XmlDirectParameterOrResult;
  parameter?: XmlParameter | XmlParameter[];
  result?: XmlDirectParameterOrResult;
}

/** Raw XML enumerator element */
interface XmlEnumerator {
  name?: string;
  code?: string;
  description?: string | XmlDescription;
}

/** Raw XML enumeration element */
interface XmlEnumeration {
  name?: string;
  code?: string;
  description?: string | XmlDescription;
  enumerator?: XmlEnumerator | XmlEnumerator[];
}

/** Raw XML suite element */
interface XmlSuite {
  name?: string;
  code?: string;
  description?: string | XmlDescription;
  class?: XmlClass | XmlClass[];
  command?: XmlCommand | XmlCommand[];
  enumeration?: XmlEnumeration | XmlEnumeration[];
}

/** Raw XML dictionary root element */
interface XmlDictionary {
  title?: string;
  suite?: XmlSuite | XmlSuite[];
}

/** Raw XML document structure */
interface XmlDocument {
  dictionary?: XmlDictionary;
}

/**
 * Helper to normalize array/single values from XML.
 * XML parsers often return a single element as an object and multiple elements as an array.
 */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Helper to convert "yes"/"no" string to boolean.
 */
function toBool(value: string | undefined): boolean {
  return value === 'yes';
}

/**
 * Helper to extract description from XML element.
 * Description can be in an attribute or a child element.
 * Always trim description text.
 */
function extractDescription(element: {
  description?: string | XmlDescription;
}): string | undefined {
  if (element.description) {
    // Child element case
    const desc =
      typeof element.description === 'string' ? element.description : element.description._text;
    return desc?.trim();
  }
  return undefined;
}

/**
 * Parse a property element.
 */
function parseProperty(element: XmlProperty): RawProperty {
  const property: RawProperty = {
    name: element.name?.trim() ?? '',
    code: element.code ?? '', // Preserve exact code (may have spaces)
    type: element.type?.trim() ?? '',
    access: (element.access ?? 'r') as 'r' | 'rw',
  };

  const description = extractDescription(element);
  if (description !== undefined) {
    property.description = description;
  }

  if (toBool(element.hidden)) {
    property.deprecated = true;
  }

  return property;
}

/**
 * Parse an element (containment) element.
 */
function parseElement(element: XmlElement): RawElement {
  return {
    type: element.type?.trim() ?? '',
    access: (element.access ?? 'r') as 'r' | 'rw',
  };
}

/**
 * Parse a class element.
 */
function parseClass(element: XmlClass): RawClass {
  const properties = toArray(element.property).map(parseProperty);
  const elements = toArray(element.element).map(parseElement);

  const classData: RawClass = {
    name: element.name?.trim() ?? '',
    code: element.code ?? '', // Preserve exact code (may have spaces)
    properties,
    elements,
  };

  if (element.plural !== undefined) {
    classData.plural = typeof element.plural === 'string' ? element.plural.trim() : element.plural;
  }

  if (element.inherits !== undefined) {
    classData.inherits =
      typeof element.inherits === 'string' ? element.inherits.trim() : element.inherits;
  }

  const description = extractDescription(element);
  if (description !== undefined) {
    classData.description = description;
  }

  if (toBool(element.hidden)) {
    classData.deprecated = true;
  }

  return classData;
}

/**
 * Parse a parameter element.
 */
function parseParameter(element: XmlParameter): RawParameter {
  const parameter: RawParameter = {
    name: element.name?.trim() ?? '',
    code: element.code ?? '', // Preserve exact code (may have spaces)
    type: element.type?.trim() ?? '',
  };

  const description = extractDescription(element);
  if (description !== undefined) {
    parameter.description = description;
  }

  if (toBool(element.optional)) {
    parameter.optional = true;
  }

  return parameter;
}

/**
 * Parse a command element.
 */
function parseCommand(element: XmlCommand): RawCommand {
  const parameters = toArray(element.parameter).map(parseParameter);

  const command: RawCommand = {
    name: element.name?.trim() ?? '',
    code: element.code ?? '', // Preserve exact code (may have spaces)
    parameters,
  };

  const description = extractDescription(element);
  if (description !== undefined) {
    command.description = description;
  }

  if (element['direct-parameter']) {
    const dp = element['direct-parameter'];
    const dpDesc = extractDescription(dp);
    command.directParameter = {
      type: dp.type?.trim() ?? '',
    };
    if (dpDesc !== undefined) {
      command.directParameter.description = dpDesc;
    }
  }

  if (element.result) {
    const res = element.result;
    const resDesc = extractDescription(res);
    command.result = {
      type: res.type?.trim() ?? '',
    };
    if (resDesc !== undefined) {
      command.result.description = resDesc;
    }
  }

  return command;
}

/**
 * Parse an enumerator element.
 */
function parseEnumerator(element: XmlEnumerator): RawEnumerator {
  const enumerator: RawEnumerator = {
    name: element.name?.trim() ?? '',
    code: element.code ?? '', // Preserve exact code (may have spaces)
  };

  const description = extractDescription(element);
  if (description !== undefined) {
    enumerator.description = description;
  }

  return enumerator;
}

/**
 * Parse an enumeration element.
 */
function parseEnumeration(element: XmlEnumeration): RawEnumeration {
  const values = toArray(element.enumerator).map(parseEnumerator);

  const enumeration: RawEnumeration = {
    name: element.name?.trim() ?? '',
    code: element.code ?? '', // Preserve exact code (may have spaces)
    values,
  };

  const description = extractDescription(element);
  if (description !== undefined) {
    enumeration.description = description;
  }

  return enumeration;
}

/**
 * Parse a suite element.
 */
function parseSuite(element: XmlSuite): RawSuite {
  const classes = toArray(element.class).map(parseClass);
  const commands = toArray(element.command).map(parseCommand);
  const enumerations = toArray(element.enumeration).map(parseEnumeration);

  const suite: RawSuite = {
    name: element.name?.trim() ?? '',
    code: element.code ?? '', // Preserve exact code (may have spaces)
    classes,
    commands,
    enumerations,
  };

  const description = extractDescription(element);
  if (description !== undefined) {
    suite.description = description;
  }

  return suite;
}

/**
 * Parse SDEF XML content into structured data.
 *
 * @param xmlContent - The raw XML string from an .sdef file
 * @returns Parsed SDEF data structure
 *
 * @example
 * ```typescript
 * const xml = await fs.readFile('app.sdef', 'utf-8');
 * const sdef = parseSdef(xml);
 * console.log(sdef.title);
 * console.log(sdef.suites[0].classes[0].name);
 * ```
 */
export function parseSdef(xmlContent: string): RawSdefData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '_text',
    parseAttributeValue: false,
    trimValues: false, // Preserve spaces in four-character codes
  });

  const doc = parser.parse(xmlContent) as XmlDocument;
  const dictionary = doc.dictionary;

  if (!dictionary) {
    throw new Error('Invalid SDEF: missing <dictionary> root element');
  }

  const title = dictionary.title?.trim() ?? 'Untitled';
  const suites = toArray(dictionary.suite).map(parseSuite);

  return { title, suites };
}
