import { describe, it, expect } from 'vitest'
import { runJxa, runWithApp, JxaExecutionError } from './executor.js'

describe('runJxa', () => {
  it('should execute simple JXA code', async () => {
    const result = await runJxa<number>('return 1 + 1;')
    expect(result).toBe(2)
  })

  it('should return string results', async () => {
    const result = await runJxa<string>('return "hello";')
    expect(result).toBe('hello')
  })

  it('should return array results', async () => {
    const result = await runJxa<number[]>('return [1, 2, 3];')
    expect(result).toEqual([1, 2, 3])
  })

  it('should return object results', async () => {
    const result = await runJxa<{ foo: string }>('return { foo: "bar" };')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('should handle undefined results', async () => {
    // Await separately to avoid confusing-void-expression error
    await runJxa<undefined>('return undefined;')
    // If we reach here without error, the test passes
    expect(true).toBe(true)
  })

  it('should throw JxaExecutionError for invalid code', async () => {
    await expect(runJxa('invalid syntax !!!')).rejects.toThrow(JxaExecutionError)
  })

  it('should include error details in JxaExecutionError', async () => {
    try {
      await runJxa('throw new Error("test error");')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(JxaExecutionError)
      const jxaError = error as JxaExecutionError
      expect(jxaError.code).toBeTruthy()
      expect(jxaError.stderr).toBeDefined()
    }
  })

  // Regression test for issue #17: the original test used a 1ms timeout on
  // `return 42;` and raced the wall clock — on a fast/warm machine the script
  // could complete before the timer, resolving instead of rejecting. Fix:
  // drive a script that *intentionally* runs longer than the timeout (JXA
  // `delay(2)` ≈ 2 s) with a 100 ms timeout so the timer always fires first.
  it('should handle timeout option', async () => {
    let thrownError: unknown
    try {
      // delay(2) sleeps for ~2 seconds; the 100 ms timeout fires well before
      // the script can finish, guaranteeing the timeout path wins every time.
      await runJxa('delay(2);', { timeout: 100 })
    } catch (err) {
      thrownError = err
    }

    // Must throw a JxaExecutionError (not a bare Error or some other type).
    expect(thrownError).toBeInstanceOf(JxaExecutionError)
    const jxaErr = thrownError as JxaExecutionError

    // The subprocess is killed by the timeout, so `cause.killed` is true.
    // This is the specific signal that the *timeout* mechanism fired (not a
    // script syntax error, a missing osascript binary, etc.).
    expect((jxaErr.cause as { killed?: boolean } | undefined)?.killed).toBe(true)
  }, 10000)
})

describe('runWithApp', () => {
  it('should get Calendar app name', async () => {
    const result = await runWithApp<string>('com.apple.iCal', 'return app.name();')
    expect(result).toBe('Calendar')
  })

  it('should check if Calendar is running', async () => {
    const result = await runWithApp<boolean>('com.apple.iCal', 'return app.running();')
    expect(typeof result).toBe('boolean')
  })

  it('should handle complex app queries', async () => {
    const result = await runWithApp<{ name: string; running: boolean }>(
      'com.apple.iCal',
      'return { name: app.name(), running: app.running() };'
    )
    expect(result.name).toBe('Calendar')
    expect(typeof result.running).toBe('boolean')
  })
})
