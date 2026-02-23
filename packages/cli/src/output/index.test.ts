import { describe, it, expect } from 'vitest'
import { createFormatter, JsonFormatter, HumanFormatter } from './index.js'

describe('createFormatter', () => {
  it('should return JsonFormatter when json is true', () => {
    const formatter = createFormatter(true)
    expect(formatter).toBeInstanceOf(JsonFormatter)
  })

  it('should return HumanFormatter when json is false', () => {
    const formatter = createFormatter(false)
    expect(formatter).toBeInstanceOf(HumanFormatter)
  })

  it('should return formatters that implement OutputFormatter interface', () => {
    const jsonFormatter = createFormatter(true)
    const humanFormatter = createFormatter(false)

    // Verify all interface methods exist
    expect(typeof jsonFormatter.format).toBe('function')
    expect(typeof jsonFormatter.formatList).toBe('function')
    expect(typeof jsonFormatter.formatError).toBe('function')
    expect(typeof jsonFormatter.formatSuccess).toBe('function')

    expect(typeof humanFormatter.format).toBe('function')
    expect(typeof humanFormatter.formatList).toBe('function')
    expect(typeof humanFormatter.formatError).toBe('function')
    expect(typeof humanFormatter.formatSuccess).toBe('function')
  })

  it('should return functional formatters', () => {
    const jsonFormatter = createFormatter(true)
    const humanFormatter = createFormatter(false)

    const testData = { name: 'test', value: 42 }

    // JSON formatter should produce valid JSON
    const jsonOutput = jsonFormatter.format(testData)
    expect(() => JSON.parse(jsonOutput) as unknown).not.toThrow()
    const parsed = JSON.parse(jsonOutput) as { data: { name: string; value: number } }
    expect(parsed.data.name).toBe('test')

    // Human formatter should produce readable text
    const humanOutput = humanFormatter.format(testData)
    expect(humanOutput).toContain('name')
    expect(humanOutput).toContain('test')
  })
})
