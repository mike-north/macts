/**
 * Tests for hierarchy builder.
 */

import { describe, it, expect } from 'vitest'
import { buildHierarchy } from './hierarchy.js'
import type { RawSdefData } from './types.js'

describe('buildHierarchy', () => {
  describe('simple two-level hierarchy', () => {
    it('should build application → documents hierarchy', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'document', access: 'rw' }],
              },
              {
                name: 'document',
                code: 'docu',
                plural: 'documents',
                description: 'A document',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.rootClass).toBe('application')
      expect(result.resources).toEqual(new Set(['application']))
      expect(result.valueTypes).toEqual(new Set(['document']))
      expect(result.ambiguousClasses.size).toBe(0)

      expect(result.hierarchy.children).toHaveProperty('documents')
      expect(result.hierarchy.children['documents']).toEqual({
        resource: 'document',
        access: 'rw',
        description: 'A document',
      })
    })

    it('should handle read-only access mode', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'window', access: 'r' }],
              },
              {
                name: 'window',
                code: 'cwin',
                plural: 'windows',
                description: 'A window',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.hierarchy.children['windows']).toEqual({
        resource: 'window',
        access: 'r',
        description: 'A window',
      })
    })
  })

  describe('deep hierarchy', () => {
    it('should build application → calendars → events → attendees', () => {
      const sdef: RawSdefData = {
        title: 'Calendar App',
        suites: [
          {
            name: 'Calendar Suite',
            code: 'wres',
            description: 'Calendar suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'calendar', access: 'rw' }],
              },
              {
                name: 'calendar',
                code: 'wres',
                plural: 'calendars',
                description: 'A calendar',
                properties: [],
                elements: [{ type: 'event', access: 'rw' }],
              },
              {
                name: 'event',
                code: 'evnt',
                plural: 'events',
                description: 'An event',
                properties: [],
                elements: [{ type: 'attendee', access: 'r' }],
              },
              {
                name: 'attendee',
                code: 'atnd',
                plural: 'attendees',
                description: 'An attendee',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.rootClass).toBe('application')
      expect(result.resources).toEqual(new Set(['application', 'calendar', 'event']))
      expect(result.valueTypes).toEqual(new Set(['attendee']))

      // Check root level
      expect(result.hierarchy.children).toHaveProperty('calendars')
      const calendar = result.hierarchy.children['calendars']
      expect(calendar).toBeDefined()
      if (!calendar) throw new Error('calendar should be defined')
      expect(calendar.resource).toBe('calendar')
      expect(calendar.access).toBe('rw')

      // Check second level
      expect(calendar.children).toHaveProperty('events')
      if (!calendar.children) throw new Error('calendar.children should be defined')
      const event = calendar.children['events']
      expect(event).toBeDefined()
      if (!event) throw new Error('event should be defined')
      expect(event.resource).toBe('event')
      expect(event.access).toBe('rw')

      // Check third level
      expect(event.children).toHaveProperty('attendees')
      if (!event.children) throw new Error('event.children should be defined')
      const attendee = event.children['attendees']
      expect(attendee).toBeDefined()
      if (!attendee) throw new Error('attendee should be defined')
      expect(attendee.resource).toBe('attendee')
      expect(attendee.access).toBe('r')
      expect(attendee.children).toBeUndefined()
    })
  })

  describe('resource vs value type detection', () => {
    it('should identify resources (classes with elements)', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'document', access: 'rw' }],
              },
              {
                name: 'document',
                code: 'docu',
                plural: 'documents',
                description: 'A document',
                properties: [],
                elements: [{ type: 'paragraph', access: 'rw' }],
              },
              {
                name: 'paragraph',
                code: 'cpar',
                plural: 'paragraphs',
                description: 'A paragraph',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.resources).toEqual(new Set(['application', 'document']))
      expect(result.valueTypes).toEqual(new Set(['paragraph']))
    })

    it('should identify value types (classes with no elements)', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [],
              },
              {
                name: 'color',
                code: 'colr',
                description: 'A color value',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.resources).toEqual(new Set())
      expect(result.valueTypes).toEqual(new Set(['application', 'color']))
    })
  })

  describe('ambiguous classes detection', () => {
    it('should detect classes with multiple parents', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [
                  { type: 'project', access: 'rw' },
                  { type: 'task', access: 'rw' },
                ],
              },
              {
                name: 'project',
                code: 'proj',
                plural: 'projects',
                description: 'A project',
                properties: [],
                elements: [{ type: 'tag', access: 'rw' }],
              },
              {
                name: 'task',
                code: 'task',
                plural: 'tasks',
                description: 'A task',
                properties: [],
                elements: [{ type: 'tag', access: 'rw' }],
              },
              {
                name: 'tag',
                code: 'tags',
                plural: 'tags',
                description: 'A tag',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.ambiguousClasses.size).toBe(1)
      expect(result.ambiguousClasses.has('tag')).toBe(true)
      expect(result.ambiguousClasses.get('tag')).toEqual(['project', 'task'])
    })

    it('should not detect single-parent classes as ambiguous', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'document', access: 'rw' }],
              },
              {
                name: 'document',
                code: 'docu',
                plural: 'documents',
                description: 'A document',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.ambiguousClasses.size).toBe(0)
    })
  })

  describe('circular reference handling', () => {
    it('should handle circular references gracefully', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'node', access: 'rw' }],
              },
              {
                name: 'node',
                code: 'node',
                plural: 'nodes',
                description: 'A node',
                properties: [],
                // Circular: node contains node
                elements: [{ type: 'node', access: 'rw' }],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      // Should not throw or infinitely loop
      expect(result.hierarchy.children).toHaveProperty('nodes')
      const node = result.hierarchy.children['nodes']
      expect(node).toBeDefined()
      if (!node) throw new Error('node should be defined')
      expect(node.resource).toBe('node')

      // The circular reference should be excluded
      expect(node.children).toBeUndefined()
    })
  })

  describe('root class detection', () => {
    it('should find "application" as root class', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'document',
                code: 'docu',
                description: 'A document',
                properties: [],
                elements: [],
              },
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'document', access: 'rw' }],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.rootClass).toBe('application')
    })

    it('should find class with no parents as root', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'root',
                code: 'root',
                description: 'The root',
                properties: [],
                elements: [{ type: 'child', access: 'rw' }],
              },
              {
                name: 'child',
                code: 'chld',
                plural: 'children',
                description: 'A child',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.rootClass).toBe('root')
    })
  })

  describe('plural name handling', () => {
    it('should use plural name as key when available', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'person', access: 'rw' }],
              },
              {
                name: 'person',
                code: 'pers',
                plural: 'people', // Irregular plural
                description: 'A person',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      // Should use "people" as key, not "person"
      expect(result.hierarchy.children).toHaveProperty('people')
      const people = result.hierarchy.children['people']
      expect(people).toBeDefined()
      if (!people) throw new Error('people should be defined')
      expect(people.resource).toBe('person')
    })

    it('should fall back to class name if no plural provided', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [{ type: 'item', access: 'rw' }],
              },
              {
                name: 'item',
                code: 'item',
                // No plural provided
                description: 'An item',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      // Should use "item" as key since no plural
      expect(result.hierarchy.children).toHaveProperty('item')
      const item = result.hierarchy.children['item']
      expect(item).toBeDefined()
      if (!item) throw new Error('item should be defined')
      expect(item.resource).toBe('item')
    })
  })

  describe('multi-suite handling', () => {
    it('should collect classes from all suites', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Standard Suite',
            code: 'core',
            description: 'Standard suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The application',
                properties: [],
                elements: [
                  { type: 'document', access: 'rw' },
                  { type: 'window', access: 'r' },
                ],
              },
              {
                name: 'document',
                code: 'docu',
                plural: 'documents',
                description: 'A document',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
          {
            name: 'Window Suite',
            code: 'wind',
            description: 'Window suite',
            classes: [
              {
                name: 'window',
                code: 'cwin',
                plural: 'windows',
                description: 'A window',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.hierarchy.children).toHaveProperty('documents')
      expect(result.hierarchy.children).toHaveProperty('windows')
      const documents = result.hierarchy.children['documents']
      const windows = result.hierarchy.children['windows']
      expect(documents).toBeDefined()
      expect(windows).toBeDefined()
      if (!documents || !windows) {
        throw new Error('documents and windows should be defined')
      }
      expect(documents.resource).toBe('document')
      expect(windows.resource).toBe('window')
    })
  })

  describe('empty cases', () => {
    it('should handle empty suites array', () => {
      const sdef: RawSdefData = {
        title: 'Empty App',
        suites: [],
      }

      const result = buildHierarchy(sdef)

      expect(result.rootClass).toBeUndefined()
      expect(result.resources.size).toBe(0)
      expect(result.valueTypes.size).toBe(0)
      expect(result.ambiguousClasses.size).toBe(0)
      expect(result.hierarchy.children).toEqual({})
    })

    it('should handle suite with no classes', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Empty Suite',
            code: 'empt',
            description: 'Empty suite',
            classes: [],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      expect(result.rootClass).toBeUndefined()
      expect(result.hierarchy.children).toEqual({})
    })
  })

  describe('description handling', () => {
    it('should preserve descriptions in hierarchy', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                description: 'The main application',
                properties: [],
                elements: [{ type: 'calendar', access: 'rw' }],
              },
              {
                name: 'calendar',
                code: 'wres',
                plural: 'calendars',
                description: 'A calendar that contains events',
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      const calendars = result.hierarchy.children['calendars']
      expect(calendars).toBeDefined()
      if (!calendars) throw new Error('calendars should be defined')
      expect(calendars.description).toBe('A calendar that contains events')
    })

    it('should handle missing descriptions', () => {
      const sdef: RawSdefData = {
        title: 'Test App',
        suites: [
          {
            name: 'Test Suite',
            code: 'test',
            description: 'Test suite',
            classes: [
              {
                name: 'application',
                code: 'capp',
                // No description
                properties: [],
                elements: [{ type: 'document', access: 'rw' }],
              },
              {
                name: 'document',
                code: 'docu',
                plural: 'documents',
                // No description
                properties: [],
                elements: [],
              },
            ],
            commands: [],
            enumerations: [],
          },
        ],
      }

      const result = buildHierarchy(sdef)

      const documents = result.hierarchy.children['documents']
      expect(documents).toBeDefined()
      if (!documents) throw new Error('documents should be defined')
      expect(documents.description).toBeUndefined()
    })
  })
})
