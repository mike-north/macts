/**
 * Build containment hierarchy from raw SDEF data.
 * @module sdef/hierarchy
 */

import type { RawSdefData, RawClass } from './types.js'
import type { HierarchyChild, Hierarchy } from '../manifest/schemas/hierarchy.js'

/**
 * Result of hierarchy analysis.
 */
export interface HierarchyResult {
  /** The containment hierarchy tree */
  hierarchy: Hierarchy
  /** Classes that are resources (have elements) */
  resources: Set<string>
  /** Classes that are value types (no elements) */
  valueTypes: Set<string>
  /** Classes with multiple parents (ambiguous) */
  ambiguousClasses: Map<string, string[]>
  /** The root class (usually 'application') */
  rootClass: string | undefined
}

/**
 * Build a containment hierarchy from SDEF data.
 *
 * This function analyzes element relationships to determine:
 * - Which classes are resources (have elements) vs value types (no elements)
 * - The parent-child containment tree
 * - The root class (typically 'application')
 * - Classes with ambiguous placement (multiple parents)
 *
 * @param sdef - Raw SDEF data
 * @returns Hierarchy analysis result
 */
export function buildHierarchy(sdef: RawSdefData): HierarchyResult {
  // 1. Collect all classes from all suites
  const allClasses = new Map<string, RawClass>()
  for (const suite of sdef.suites) {
    for (const cls of suite.classes) {
      allClasses.set(cls.name, cls)
    }
  }

  // 2. Identify resources vs value types
  // - Resource: class that has elements (contains other classes)
  // - Value type: class with no elements (leaf node)
  const resources = new Set<string>()
  const valueTypes = new Set<string>()

  allClasses.forEach((cls, name) => {
    if (cls.elements.length > 0) {
      resources.add(name)
    } else {
      valueTypes.add(name)
    }
  })

  // 3. Build parent→children map
  // For each class, record which classes contain it as an element
  const parentMap = new Map<string, string[]>() // child → parents

  allClasses.forEach((cls, parentName) => {
    for (const element of cls.elements) {
      const childName = element.type
      if (!parentMap.has(childName)) {
        parentMap.set(childName, [])
      }
      const parents = parentMap.get(childName)
      if (parents) {
        parents.push(parentName)
      }
    }
  })

  // 4. Find root class (application, or class with no parents)
  let rootClass: string | undefined
  for (const name of allClasses.keys()) {
    if (name === 'application' || !parentMap.has(name)) {
      rootClass = name
      break
    }
  }

  // 5. Detect ambiguous classes (multiple parents)
  const ambiguousClasses = new Map<string, string[]>()
  parentMap.forEach((parents, child) => {
    if (parents.length > 1) {
      ambiguousClasses.set(child, parents)
    }
  })

  // 6. Build recursive hierarchy tree
  function buildChild(className: string, visited: Set<string>): HierarchyChild | undefined {
    if (visited.has(className)) {
      return undefined // Circular reference
    }
    visited.add(className)

    const cls = allClasses.get(className)
    if (!cls) {
      return undefined
    }

    const children: Record<string, HierarchyChild> = {}
    for (const element of cls.elements) {
      const childHierarchy = buildChild(element.type, new Set(visited))
      if (childHierarchy) {
        // Use plural name as key if available
        const childClass = allClasses.get(element.type)
        const key = childClass?.plural ?? element.type
        children[key] = {
          ...childHierarchy,
          access: element.access,
        }
      }
    }

    return {
      resource: className,
      access: 'rw', // Default, will be overridden by parent
      description: cls.description,
      ...(Object.keys(children).length > 0 ? { children } : {}),
    }
  }

  // 7. Build hierarchy from root
  const hierarchy: Hierarchy = { children: {} }
  if (rootClass) {
    const rootCls = allClasses.get(rootClass)
    if (rootCls) {
      for (const element of rootCls.elements) {
        const childHierarchy = buildChild(element.type, new Set())
        if (childHierarchy) {
          const childClass = allClasses.get(element.type)
          const key = childClass?.plural ?? element.type
          hierarchy.children[key] = {
            ...childHierarchy,
            access: element.access,
          }
        }
      }
    }
  }

  return {
    hierarchy,
    resources,
    valueTypes,
    ambiguousClasses,
    rootClass,
  }
}
