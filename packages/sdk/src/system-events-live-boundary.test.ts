/** Native-free checks for the live suite's output and cleanup boundaries. */
import { describe, expect, it, vi } from 'vitest'
import {
  runLiveCheck,
  stopSystemEvents,
  systemEventsIsRunning,
} from './system-events-live-boundary.js'

describe('System Events live boundary', () => {
  it('fails with a fixed error without exposing nested private values', async () => {
    const privateValue = '/private/sentinel-person'
    const error = new Error(privateValue, { cause: new Error(privateValue) })
    const result = await runLiveCheck(() => Promise.reject(error)).catch(
      (caught: unknown) => caught
    )
    expect(result).toBeInstanceOf(Error)
    expect(String(result)).toBe('Error: System Events live check failed')
    expect(JSON.stringify(result)).not.toContain(privateValue)
    expect((result as Error).cause).toBeUndefined()
    expect((result as Error).stack).not.toContain(privateValue)
  })
  it('propagates successful values', async () => {
    await expect(runLiveCheck(() => Promise.resolve(7))).resolves.toBe(7)
  })
  it('bounds and silences cleanup without exposing subprocess failures', () => {
    const run = vi.fn(() => {
      throw new Error('/private/sentinel-person')
    })
    let failure: unknown
    try {
      stopSystemEvents(run)
    } catch (error) {
      failure = error
    }
    expect(String(failure)).toBe('Error: System Events cleanup failed')
    expect((failure as Error).cause).toBeUndefined()
    expect(run).toHaveBeenCalledWith(
      'osascript',
      ['-e', 'tell application id "com.apple.systemevents" to quit'],
      { stdio: 'ignore', timeout: 10_000 }
    )
  })
  it('distinguishes absent app from failed process inspection', () => {
    const absent = vi.fn(() => {
      throw Object.assign(new Error('private'), { status: 1 })
    })
    const unknown = vi.fn(() => {
      throw Object.assign(new Error('private'), { status: 2 })
    })
    expect(systemEventsIsRunning(absent)).toBe(false)
    expect(() => systemEventsIsRunning(unknown)).toThrow('System Events state inspection failed')
    expect(systemEventsIsRunning(vi.fn())).toBe(true)
  })
})
