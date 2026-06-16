import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { AppManifestSchema, type AppManifest } from '@macts/core'

describe('Calendar manifest', () => {
  let manifest: AppManifest

  beforeAll(() => {
    const yamlContent = readFileSync(join(__dirname, 'app.yaml'), 'utf-8')
    const parsed = parseYaml(yamlContent)
    manifest = AppManifestSchema.parse(parsed)
  })

  describe('app metadata', () => {
    it('should have correct bundle identifier', () => {
      expect(manifest.app.bundleId).toBe('com.apple.iCal')
    })

    it('should have correct app name', () => {
      expect(manifest.app.name).toBe('Calendar')
    })

    it('should require calendar and automation TCC entitlements', () => {
      expect(manifest.app.tccEntitlements).toContain('calendar')
      expect(manifest.app.tccEntitlements).toContain('automation')
    })

    it('should be a system app', () => {
      expect(manifest.app.distributionModel).toBe('system')
    })
  })

  describe('resources', () => {
    it('should define Calendar resource', () => {
      expect(manifest.resources.Calendar).toBeDefined()
      expect(manifest.resources.Calendar.name).toBe('Calendar')
      expect(manifest.resources.Calendar.code).toBe('wres')
    })

    it('should define Event resource', () => {
      expect(manifest.resources.Event).toBeDefined()
      expect(manifest.resources.Event.name).toBe('Event')
      expect(manifest.resources.Event.code).toBe('wrev')
    })

    it('should define Attendee resource', () => {
      expect(manifest.resources.Attendee).toBeDefined()
      expect(manifest.resources.Attendee.name).toBe('Attendee')
      expect(manifest.resources.Attendee.code).toBe('wrea')
    })

    it('should define all alarm types', () => {
      expect(manifest.resources.DisplayAlarm).toBeDefined()
      expect(manifest.resources.MailAlarm).toBeDefined()
      expect(manifest.resources.SoundAlarm).toBeDefined()
      expect(manifest.resources.OpenFileAlarm).toBeDefined()
    })

    it('should have Calendar with correct properties', () => {
      const calendar = manifest.resources.Calendar
      expect(calendar.properties.name).toBeDefined()
      expect(calendar.properties.name.access).toBe('rw')
      expect(calendar.properties.calendarIdentifier).toBeDefined()
      expect(calendar.properties.calendarIdentifier.access).toBe('r')
      expect(calendar.properties.color).toBeDefined()
      expect(calendar.properties.color.type).toBe('rgb')
    })

    it('should have Event with correct date properties', () => {
      const event = manifest.resources.Event
      expect(event.properties.startDate).toBeDefined()
      expect(event.properties.startDate.type).toBe('date')
      expect(event.properties.endDate).toBeDefined()
      expect(event.properties.endDate.type).toBe('date')
    })

    it('should have Event with status enum reference', () => {
      const event = manifest.resources.Event
      expect(event.properties.status).toBeDefined()
      expect(event.properties.status.type).toEqual({ enum: 'EventStatus' })
    })

    it('should have Attendee with participation status enum', () => {
      const attendee = manifest.resources.Attendee
      expect(attendee.properties.participationStatus).toBeDefined()
      expect(attendee.properties.participationStatus.type).toEqual({
        enum: 'ParticipationStatus',
      })
    })

    it('should have primary identifiers', () => {
      // Calendar is targeted by NAME via byProperty (#81): the dictionary
      // `calendarIdentifier` throws via JXA at runtime, so `name` (which works)
      // is the runtime identifier and the resource is matched on it.
      const calendar = manifest.resources.Calendar
      expect(calendar.identifiers).toContainEqual({
        property: 'name',
        primary: true,
        targeting: 'byProperty',
      })

      // Event's `uid` IS runtime-valid, so it keeps the default byId targeting.
      const event = manifest.resources.Event
      expect(event.identifiers).toContainEqual({
        property: 'uid',
        primary: true,
      })
    })

    it('should have deprecated properties on OpenFileAlarm', () => {
      const alarm = manifest.resources.OpenFileAlarm
      expect(alarm.properties.triggerInterval.deprecated).toBeDefined()
      expect(alarm.properties.triggerInterval.deprecated?.since).toBe('10.14')
      expect(alarm.properties.filepath.deprecated).toBeDefined()
    })

    it('should have array type for excluded dates', () => {
      const event = manifest.resources.Event
      expect(event.properties.excludedDates.type).toEqual({ array: 'date' })
    })
  })

  describe('enums', () => {
    it('should define ParticipationStatus enum', () => {
      expect(manifest.enums.ParticipationStatus).toBeDefined()
      expect(manifest.enums.ParticipationStatus.code).toBe('wre6')
    })

    it('should define EventStatus enum', () => {
      expect(manifest.enums.EventStatus).toBeDefined()
      expect(manifest.enums.EventStatus.code).toBe('wre4')
    })

    it('should define ViewType enum', () => {
      expect(manifest.enums.ViewType).toBeDefined()
      expect(manifest.enums.ViewType.code).toBe('wre5')
    })

    it('should have correct ParticipationStatus values', () => {
      const values = manifest.enums.ParticipationStatus.values
      expect(values).toContainEqual({
        name: 'unknown',
        value: 'unknown',
        description: 'No answer yet',
        code: 'E6na',
      })
      expect(values).toContainEqual({
        name: 'accepted',
        value: 'accepted',
        description: 'Invitation has been accepted',
        code: 'E6ap',
      })
    })

    it('should have correct EventStatus values', () => {
      const values = manifest.enums.EventStatus.values
      expect(values.map((v) => v.name)).toContain('cancelled')
      expect(values.map((v) => v.name)).toContain('confirmed')
      expect(values.map((v) => v.name)).toContain('tentative')
    })

    it('should have correct ViewType values', () => {
      const values = manifest.enums.ViewType.values
      expect(values.map((v) => v.name)).toEqual(['dayView', 'weekView', 'monthView'])
    })

    it('should have CalendarPriority with numeric values', () => {
      const values = manifest.enums.CalendarPriority.values
      expect(values).toContainEqual({
        name: 'noPriority',
        value: 0,
        description: 'No priority',
        code: 'tdp0',
      })
      expect(values).toContainEqual({
        name: 'highPriority',
        value: 1,
        description: 'High priority',
        code: 'tdp1',
      })
    })
  })

  describe('hierarchy', () => {
    it('should have calendars at root level', () => {
      expect(manifest.hierarchy.children.calendars).toBeDefined()
      expect(manifest.hierarchy.children.calendars.resource).toBe('Calendar')
      expect(manifest.hierarchy.children.calendars.access).toBe('rw')
    })

    it('should have events under calendars', () => {
      const calendars = manifest.hierarchy.children.calendars
      expect(calendars.children?.events).toBeDefined()
      expect(calendars.children?.events.resource).toBe('Event')
      expect(calendars.children?.events.access).toBe('rw')
    })

    it('should have attendees under events', () => {
      const events = manifest.hierarchy.children.calendars.children?.events
      expect(events?.children?.attendees).toBeDefined()
      expect(events?.children?.attendees.resource).toBe('Attendee')
      expect(events?.children?.attendees.access).toBe('r')
    })

    it('should have all alarm types under events', () => {
      const events = manifest.hierarchy.children.calendars.children?.events
      expect(events?.children?.displayAlarms).toBeDefined()
      expect(events?.children?.displayAlarms.resource).toBe('DisplayAlarm')
      expect(events?.children?.mailAlarms).toBeDefined()
      expect(events?.children?.mailAlarms.resource).toBe('MailAlarm')
      expect(events?.children?.soundAlarms).toBeDefined()
      expect(events?.children?.soundAlarms.resource).toBe('SoundAlarm')
      expect(events?.children?.openFileAlarms).toBeDefined()
      expect(events?.children?.openFileAlarms.resource).toBe('OpenFileAlarm')
    })
  })

  describe('commands', () => {
    it('should define reloadCalendars command', () => {
      expect(manifest.commands.reloadCalendars).toBeDefined()
      expect(manifest.commands.reloadCalendars.scope).toBe('application')
      expect(manifest.commands.reloadCalendars.parameters).toHaveLength(0)
    })

    it('should define switchView command', () => {
      expect(manifest.commands.switchView).toBeDefined()
      expect(manifest.commands.switchView.scope).toBe('application')
      expect(manifest.commands.switchView.parameters).toHaveLength(1)
      expect(manifest.commands.switchView.parameters[0].name).toBe('to')
      expect(manifest.commands.switchView.parameters[0].type).toBe('ViewType')
    })

    it('should define viewCalendar command', () => {
      expect(manifest.commands.viewCalendar).toBeDefined()
      expect(manifest.commands.viewCalendar.scope).toBe('application')
      expect(manifest.commands.viewCalendar.parameters).toHaveLength(1)
      expect(manifest.commands.viewCalendar.parameters[0].name).toBe('at')
      expect(manifest.commands.viewCalendar.parameters[0].type).toBe('date')
    })

    it('should define show command for events', () => {
      expect(manifest.commands.show).toBeDefined()
      expect(manifest.commands.show.scope).toBe('resource')
      expect(manifest.commands.show.resourceType).toBe('Event')
      expect(manifest.commands.show.parameters).toHaveLength(0)
    })
  })

  describe('suites', () => {
    it('should have Standard Suite', () => {
      const standardSuite = manifest.suites.find((s) => s.name === 'Standard Suite')
      expect(standardSuite).toBeDefined()
      expect(standardSuite?.code).toBe('????')
    })

    it('should have iCal suite', () => {
      const iCalSuite = manifest.suites.find((s) => s.name === 'iCal')
      expect(iCalSuite).toBeDefined()
      expect(iCalSuite?.code).toBe('wrbt')
    })

    it('should organize resources into iCal suite', () => {
      const iCalSuite = manifest.suites.find((s) => s.name === 'iCal')
      expect(iCalSuite?.resources).toContain('Calendar')
      expect(iCalSuite?.resources).toContain('Event')
      expect(iCalSuite?.resources).toContain('Attendee')
    })

    it('should organize commands into iCal suite', () => {
      const iCalSuite = manifest.suites.find((s) => s.name === 'iCal')
      expect(iCalSuite?.commands).toContain('reloadCalendars')
      expect(iCalSuite?.commands).toContain('switchView')
      expect(iCalSuite?.commands).toContain('viewCalendar')
      expect(iCalSuite?.commands).toContain('show')
    })

    it('should organize enums into iCal suite', () => {
      const iCalSuite = manifest.suites.find((s) => s.name === 'iCal')
      expect(iCalSuite?.enums).toContain('ParticipationStatus')
      expect(iCalSuite?.enums).toContain('EventStatus')
      expect(iCalSuite?.enums).toContain('ViewType')
    })
  })

  describe('extraction metadata', () => {
    it('should have extraction metadata', () => {
      expect(manifest.extraction).toBeDefined()
    })

    it('should reference source SDEF', () => {
      expect(manifest.extraction?.sourceFile).toBe('source.sdef')
    })

    it('should have high confidence scores', () => {
      expect(manifest.extraction?.confidence).toBeDefined()
      expect(manifest.extraction?.confidence?.overall).toBeGreaterThanOrEqual(0.9)
    })

    it('should have open questions', () => {
      expect(manifest.extraction?.openQuestions).toBeDefined()
      expect(manifest.extraction?.openQuestions?.length).toBeGreaterThan(0)
    })
  })

  describe('schema validation', () => {
    it('should validate against AppManifestSchema', () => {
      // If we got here, the beforeAll already validated the manifest
      expect(manifest.version).toBe('1.0')
    })

    it('should have at least one resource', () => {
      expect(Object.keys(manifest.resources).length).toBeGreaterThan(0)
    })

    it('should have valid property access modes', () => {
      for (const resource of Object.values(manifest.resources)) {
        for (const property of Object.values(resource.properties)) {
          expect(['r', 'rw']).toContain(property.access)
        }
      }
    })

    it('should have valid command scopes', () => {
      for (const command of Object.values(manifest.commands)) {
        expect(['application', 'resource']).toContain(command.scope)
      }
    })

    it('should have valid hierarchy access modes', () => {
      function checkHierarchyNode(node: any) {
        expect(['r', 'rw']).toContain(node.access)
        if (node.children) {
          for (const child of Object.values(node.children)) {
            checkHierarchyNode(child)
          }
        }
      }

      for (const child of Object.values(manifest.hierarchy.children)) {
        checkHierarchyNode(child)
      }
    })
  })

  describe('type references', () => {
    it('should have all enum references point to defined enums', () => {
      for (const resource of Object.values(manifest.resources)) {
        for (const property of Object.values(resource.properties)) {
          if (property.type && typeof property.type === 'object' && 'enum' in property.type) {
            expect(manifest.enums[property.type.enum]).toBeDefined()
          }
        }
      }
    })

    it('should have all hierarchy resources point to defined resources', () => {
      function checkHierarchyNode(node: any) {
        expect(manifest.resources[node.resource]).toBeDefined()
        if (node.children) {
          for (const child of Object.values(node.children)) {
            checkHierarchyNode(child)
          }
        }
      }

      for (const child of Object.values(manifest.hierarchy.children)) {
        checkHierarchyNode(child)
      }
    })

    it('should have all resource-scoped commands point to defined resources', () => {
      for (const command of Object.values(manifest.commands)) {
        if (command.scope === 'resource' && command.resourceType) {
          const types = Array.isArray(command.resourceType)
            ? command.resourceType
            : [command.resourceType]
          for (const type of types) {
            expect(manifest.resources[type]).toBeDefined()
          }
        }
      }
    })
  })

  describe('negative tests - missing required fields', () => {
    it('should reject manifest without version', () => {
      const invalid = { ...manifest }
      delete (invalid as any).version
      expect(() => AppManifestSchema.parse(invalid)).toThrow()
    })

    it('should reject manifest without app metadata', () => {
      const invalid = { ...manifest }
      delete (invalid as any).app
      expect(() => AppManifestSchema.parse(invalid)).toThrow()
    })

    it('should reject manifest without resources', () => {
      const invalid = { ...manifest }
      delete (invalid as any).resources
      expect(() => AppManifestSchema.parse(invalid)).toThrow()
    })

    it('should reject manifest with empty resources', () => {
      const invalid = { ...manifest, resources: {} }
      expect(() => AppManifestSchema.parse(invalid)).toThrow()
    })

    it('should reject manifest without hierarchy', () => {
      const invalid = { ...manifest }
      delete (invalid as any).hierarchy
      expect(() => AppManifestSchema.parse(invalid)).toThrow()
    })

    it('should reject resource without required properties', () => {
      const invalidResource = { ...manifest }
      invalidResource.resources.Calendar = {} as any
      expect(() => AppManifestSchema.parse(invalidResource)).toThrow()
    })

    it('should reject property with invalid access mode', () => {
      const yamlContent = readFileSync(join(__dirname, 'app.yaml'), 'utf-8')
      const invalidResource = parseYaml(yamlContent)
      invalidResource.resources.Calendar.properties.name.access = 'x'
      expect(() => AppManifestSchema.parse(invalidResource)).toThrow()
    })

    it('should reject command with invalid scope', () => {
      const yamlContent = readFileSync(join(__dirname, 'app.yaml'), 'utf-8')
      const invalidCommand = parseYaml(yamlContent)
      invalidCommand.commands.reloadCalendars.scope = 'invalid'
      expect(() => AppManifestSchema.parse(invalidCommand)).toThrow()
    })

    it('should reject enum with invalid code length', () => {
      const yamlContent = readFileSync(join(__dirname, 'app.yaml'), 'utf-8')
      const invalidEnum = parseYaml(yamlContent)
      invalidEnum.enums.EventStatus.code = 'TOOLONG'
      expect(() => AppManifestSchema.parse(invalidEnum)).toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle optional fields being undefined', () => {
      const minimal = {
        version: '1.0',
        app: {
          bundleId: 'com.test.app',
          name: 'Test',
          tccEntitlements: [],
        },
        resources: {
          Test: {
            name: 'Test',
            plural: 'Tests',
            description: 'A test',
            properties: {
              id: {
                access: 'r',
                description: 'ID',
                optional: false,
              },
            },
          },
        },
        hierarchy: {
          children: {
            tests: {
              resource: 'Test',
              access: 'r',
              description: 'Tests',
            },
          },
        },
      }
      expect(() => AppManifestSchema.parse(minimal)).not.toThrow()
    })

    it('should handle deeply nested hierarchy', () => {
      const calendars = manifest.hierarchy.children.calendars
      const events = calendars.children?.events
      const alarms = events?.children?.displayAlarms
      expect(alarms).toBeDefined()
      expect(alarms?.resource).toBe('DisplayAlarm')
    })

    it('should handle properties with complex types', () => {
      const event = manifest.resources.Event
      // Array type
      expect(event.properties.excludedDates.type).toEqual({ array: 'date' })
      // Enum type
      expect(event.properties.status.type).toEqual({ enum: 'EventStatus' })
    })
  })
})
