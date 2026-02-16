/**
 * SDEF (Scripting Definition) parser and utilities.
 * @module sdef
 */

export type {
  RawProperty,
  RawElement,
  RawClass,
  RawParameter,
  RawCommand,
  RawEnumerator,
  RawEnumeration,
  RawSuite,
  RawSdefData,
} from './types.js';

export type { HierarchyResult } from './hierarchy.js';
export { buildHierarchy } from './hierarchy.js';
