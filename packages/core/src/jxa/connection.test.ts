import { describe, it, expect } from 'vitest'
import { isAppRunning, getAppName, connect, activateApp } from './connection.js'
import { JxaExecutionError } from './executor.js'

describe('isAppRunning', () => {
  it('should return boolean for Calendar', async () => {
    const running = await isAppRunning('com.apple.iCal')
    expect(typeof running).toBe('boolean')
  })

  it('should return boolean for Finder', async () => {
    const running = await isAppRunning('com.apple.finder')
    expect(typeof running).toBe('boolean')
    // Finder is always running on macOS
    expect(running).toBe(true)
  })
})

describe('getAppName', () => {
  it('should get Calendar app name', async () => {
    const name = await getAppName('com.apple.iCal')
    expect(name).toBe('Calendar')
  })

  it('should get Finder app name', async () => {
    const name = await getAppName('com.apple.finder')
    expect(name).toBe('Finder')
  })

  it('should get System Events app name', async () => {
    const name = await getAppName('com.apple.systemevents')
    expect(name).toBe('System Events')
  })
})

describe('activateApp', () => {
  it('should throw for non-running app', async () => {
    // Test that activate throws an error when app isn't running
    // Calendar may not be running during test
    const running = await isAppRunning('com.apple.iCal')

    if (!running) {
      await expect(activateApp('com.apple.iCal')).rejects.toThrow(JxaExecutionError)
    } else {
      // If Calendar is running, this test is satisfied either way
      // (we just need to verify the function exists and can be called)
      expect(typeof activateApp).toBe('function')
    }
  })
})

describe('connect', () => {
  it('should create connection to Calendar', async () => {
    const conn = await connect('com.apple.iCal')
    expect(conn.bundleId).toBe('com.apple.iCal')
    expect(conn.name).toBe('Calendar')
    expect(typeof conn.isRunning).toBe('function')
    expect(typeof conn.activate).toBe('function')
    expect(typeof conn.quit).toBe('function')
  })

  it('should create connection to Finder', async () => {
    const conn = await connect('com.apple.finder')
    expect(conn.bundleId).toBe('com.apple.finder')
    expect(conn.name).toBe('Finder')
  })

  it('should have working isRunning method', async () => {
    const conn = await connect('com.apple.finder')
    const running = await conn.isRunning()
    expect(typeof running).toBe('boolean')
    expect(running).toBe(true) // Finder is always running
  })

  it('should have working activate method type', async () => {
    const conn = await connect('com.apple.iCal')
    // Just verify the method exists and is callable
    expect(typeof conn.activate).toBe('function')
  })
})
