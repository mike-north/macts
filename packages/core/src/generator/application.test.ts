import { describe, it, expect } from 'vitest'
import { generateApplicationClass } from './application.js'
import { createGeneratorContext } from './context.js'
import type { AppManifest } from '../manifest/index.js'

const mockManifest: AppManifest = {
  version: '1.0',
  app: {
    bundleId: 'com.apple.iCal',
    name: 'Calendar',
    tccEntitlements: ['calendar'],
  },
  suites: [],
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'calendars',
      description: 'A calendar',
      properties: {},
    },
  },
  enums: {},
  hierarchy: {
    children: {
      calendars: {
        resource: 'Calendar',
        access: 'rw',
      },
    },
  },
  relationships: [],
  commands: {
    reloadCalendars: {
      name: 'reloadCalendars',
      description: 'Reload all calendars',
      scope: 'application',
      parameters: [],
    },
    switchView: {
      name: 'switchView',
      description: 'Switch calendar view',
      scope: 'application',
      parameters: [{ name: 'to', type: 'string', description: 'View name', required: true }],
    },
  },
}

describe('generateApplicationClass', () => {
  const ctx = createGeneratorContext(mockManifest, {
    outDir: '/tmp/out',
    packageName: '@macts/sdk-calendar',
  })

  it('should generate class with app name', () => {
    const result = generateApplicationClass(ctx)
    expect(result.name).toBe('Calendar')
    expect(result.content).toContain('class Calendar')
  })

  it('should include bundle ID', () => {
    const result = generateApplicationClass(ctx)
    expect(result.content).toContain('com.apple.iCal')
  })

  it('should generate connect method', () => {
    const result = generateApplicationClass(ctx)
    expect(result.content).toContain('static async connect()')
  })

  it('should generate collection accessors', () => {
    const result = generateApplicationClass(ctx)
    expect(result.content).toContain('get calendars()')
    expect(result.content).toContain('CalendarCollection')
  })

  it('should generate app commands', () => {
    const result = generateApplicationClass(ctx)
    expect(result.content).toContain('async reloadCalendars()')
    expect(result.content).toContain('async switchView(')
  })

  it('should generate lifecycle methods', () => {
    const result = generateApplicationClass(ctx)
    expect(result.content).toContain('async isRunning()')
    expect(result.content).toContain('async activate()')
    expect(result.content).toContain('async quit()')
  })
})
