/**
 * Raw SDEF data types representing the structure of Apple Event terminology.
 * These types map directly to the XML structure found in .sdef files.
 * @module sdef/types
 */

/**
 * Raw property from SDEF - represents an attribute of a class.
 */
export interface RawProperty {
  /** Property name (e.g., "name", "bounds") */
  name: string
  /** Four-character code for Apple Events (e.g., "pnam") */
  code: string
  /** Type of the property (e.g., "text", "integer", "rectangle") */
  type: string
  /** Access level: read-only or read-write */
  access: 'r' | 'rw'
  /** Human-readable description */
  description?: string
  /** Whether this property is deprecated */
  deprecated?: boolean
}

/**
 * Raw element from SDEF - represents a containment relationship.
 * Elements define what types of objects can be contained by a class.
 */
export interface RawElement {
  /** Type of element that can be contained (class name) */
  type: string
  /** Access level: read-only or read-write */
  access: 'r' | 'rw'
}

/**
 * Raw class from SDEF - represents an AppleScript object class.
 */
export interface RawClass {
  /** Class name (e.g., "document", "window") */
  name: string
  /** Four-character code for Apple Events (e.g., "docu") */
  code: string
  /** Plural form of the class name */
  plural?: string
  /** Name of parent class for inheritance */
  inherits?: string
  /** Human-readable description */
  description?: string
  /** Properties owned by this class */
  properties: RawProperty[]
  /** Elements that can be contained by this class */
  elements: RawElement[]
  /** Whether this class is deprecated */
  deprecated?: boolean
}

/**
 * Raw parameter for commands - represents a named parameter.
 */
export interface RawParameter {
  /** Parameter name */
  name: string
  /** Four-character code for Apple Events */
  code: string
  /** Type of the parameter */
  type: string
  /** Human-readable description */
  description?: string
  /** Whether this parameter is optional */
  optional?: boolean
}

/**
 * Raw command from SDEF - represents an AppleScript command/verb.
 */
export interface RawCommand {
  /** Command name (e.g., "open", "save") */
  name: string
  /** Four-character code for Apple Events (e.g., "aevtodoc") */
  code: string
  /** Human-readable description */
  description?: string
  /** Direct parameter (the unnamed parameter after the command) */
  directParameter?: { type: string; description?: string }
  /** Named parameters */
  parameters: RawParameter[]
  /** Return value specification */
  result?: { type: string; description?: string }
}

/**
 * Raw enumerator value - a single value in an enumeration.
 */
export interface RawEnumerator {
  /** Enumerator name (e.g., "yes", "no", "ask") */
  name: string
  /** Four-character code for Apple Events */
  code: string
  /** Human-readable description */
  description?: string
}

/**
 * Raw enumeration - represents a set of named constant values.
 */
export interface RawEnumeration {
  /** Enumeration name (e.g., "save options") */
  name: string
  /** Four-character code for Apple Events */
  code: string
  /** Human-readable description */
  description?: string
  /** Possible values for this enumeration */
  values: RawEnumerator[]
}

/**
 * Raw suite - a logical grouping of related classes, commands, and enumerations.
 * Suites organize terminology by functional area (e.g., "Standard Suite", "Text Suite").
 */
export interface RawSuite {
  /** Suite name */
  name: string
  /** Four-character code for Apple Events */
  code: string
  /** Human-readable description */
  description?: string
  /** Classes defined in this suite */
  classes: RawClass[]
  /** Commands defined in this suite */
  commands: RawCommand[]
  /** Enumerations defined in this suite */
  enumerations: RawEnumeration[]
}

/**
 * Complete parsed SDEF data - represents an entire scripting dictionary.
 */
export interface RawSdefData {
  /** Title of the application/dictionary */
  title: string
  /** Suites containing the terminology */
  suites: RawSuite[]
}
