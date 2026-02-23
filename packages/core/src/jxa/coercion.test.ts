import { describe, it, expect } from 'vitest'
import {
  dateCoercer,
  colorCoercer,
  createEnumCoercer,
  pathCoercer,
  booleanCoercer,
  numberCoercer,
  stringCoercer,
  createArrayCoercer,
  nullSafe,
} from './coercion.js'

describe('dateCoercer', () => {
  it('should convert Date to JXA code', () => {
    const date = new Date('2024-01-15T10:30:00.000Z')
    const code = dateCoercer.toJxa(date)
    expect(code).toBe('new Date("2024-01-15T10:30:00.000Z")')
  })

  it('should convert ISO string to Date', () => {
    const result = dateCoercer.fromJxa('2024-01-15T10:30:00.000Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
  })

  it('should convert timestamp to Date', () => {
    const timestamp = Date.now()
    const result = dateCoercer.fromJxa(timestamp)
    expect(result).toBeInstanceOf(Date)
  })

  it('should convert Date instance from JXA', () => {
    const date = new Date('2024-01-15T10:30:00.000Z')
    const result = dateCoercer.fromJxa(date)
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z')
  })

  it('should throw for invalid date', () => {
    expect(() => dateCoercer.fromJxa({})).toThrow('Cannot coerce object to Date')
  })

  it('should throw for array', () => {
    expect(() => dateCoercer.fromJxa([])).toThrow('Cannot coerce object to Date')
  })
})

describe('colorCoercer', () => {
  it('should convert hex to RGB array', () => {
    const code = colorCoercer.toJxa('#FF8800')
    expect(code).toBe('[65535, 34952, 0]')
  })

  it('should convert black', () => {
    const code = colorCoercer.toJxa('#000000')
    expect(code).toBe('[0, 0, 0]')
  })

  it('should convert white', () => {
    const code = colorCoercer.toJxa('#FFFFFF')
    expect(code).toBe('[65535, 65535, 65535]')
  })

  it('should handle lowercase hex', () => {
    const code = colorCoercer.toJxa('#ff8800')
    expect(code).toBe('[65535, 34952, 0]')
  })

  it('should convert RGB array to hex', () => {
    const hex = colorCoercer.fromJxa([65535, 0, 0])
    expect(hex).toBe('#ff0000')
  })

  it('should convert RGB array to hex with lowercase', () => {
    const hex = colorCoercer.fromJxa([65535, 34952, 0])
    expect(hex).toBe('#ff8800')
  })

  it('should throw for invalid color array length', () => {
    expect(() => colorCoercer.fromJxa([1, 2])).toThrow('Expected RGB array for color')
  })

  it('should throw for non-array', () => {
    expect(() => colorCoercer.fromJxa('not-array')).toThrow('Expected RGB array for color')
  })

  it('should throw for empty array', () => {
    expect(() => colorCoercer.fromJxa([])).toThrow('Expected RGB array for color')
  })
})

describe('createEnumCoercer', () => {
  const statusEnum = createEnumCoercer([
    { name: 'accepted', code: 'eacc' },
    { name: 'declined', code: 'edec' },
    { name: 'tentative', code: 'eten' },
  ])

  it('should convert name to code', () => {
    expect(statusEnum.toJxa('accepted')).toBe('"eacc"')
    expect(statusEnum.toJxa('declined')).toBe('"edec"')
    expect(statusEnum.toJxa('tentative')).toBe('"eten"')
  })

  it('should convert code to name', () => {
    expect(statusEnum.fromJxa('eacc')).toBe('accepted')
    expect(statusEnum.fromJxa('edec')).toBe('declined')
    expect(statusEnum.fromJxa('eten')).toBe('tentative')
  })

  it('should throw for unknown name', () => {
    expect(() => statusEnum.toJxa('unknown')).toThrow('Unknown enum value: unknown')
  })

  it('should throw for unknown code', () => {
    expect(() => statusEnum.fromJxa('xxxx')).toThrow('Unknown enum code: xxxx')
  })

  it('should throw for non-string in fromJxa', () => {
    expect(() => statusEnum.fromJxa(123)).toThrow('Expected string for enum, got number')
  })

  it('should throw for null in fromJxa', () => {
    expect(() => statusEnum.fromJxa(null)).toThrow('Expected string for enum, got object')
  })
})

describe('pathCoercer', () => {
  it('should wrap path in Path()', () => {
    expect(pathCoercer.toJxa('/Users/test/file.txt')).toBe('Path("/Users/test/file.txt")')
  })

  it('should handle relative paths', () => {
    expect(pathCoercer.toJxa('./relative/path.txt')).toBe('Path("./relative/path.txt")')
  })

  it('should convert AppleScript path to POSIX', () => {
    expect(pathCoercer.fromJxa('/Users/test/file.txt')).toBe('/Users/test/file.txt')
  })

  it('should convert colon-separated path to POSIX', () => {
    expect(pathCoercer.fromJxa('Macintosh HD:Users:test:file.txt')).toBe(
      'Macintosh HD/Users/test/file.txt'
    )
  })

  it('should throw for non-string path', () => {
    expect(() => pathCoercer.fromJxa(123)).toThrow('Expected string path, got number')
  })
})

describe('booleanCoercer', () => {
  it('should convert boolean to string', () => {
    expect(booleanCoercer.toJxa(true)).toBe('true')
    expect(booleanCoercer.toJxa(false)).toBe('false')
  })

  it('should convert from boolean', () => {
    expect(booleanCoercer.fromJxa(true)).toBe(true)
    expect(booleanCoercer.fromJxa(false)).toBe(false)
  })

  it('should convert from string', () => {
    expect(booleanCoercer.fromJxa('true')).toBe(true)
    expect(booleanCoercer.fromJxa('false')).toBe(false)
  })

  it('should throw for invalid string', () => {
    expect(() => booleanCoercer.fromJxa('yes')).toThrow('Cannot coerce string to boolean')
  })

  it('should throw for number', () => {
    expect(() => booleanCoercer.fromJxa(1)).toThrow('Cannot coerce number to boolean')
  })
})

describe('numberCoercer', () => {
  it('should convert number to string', () => {
    expect(numberCoercer.toJxa(42)).toBe('42')
    expect(numberCoercer.toJxa(3.14)).toBe('3.14')
    expect(numberCoercer.toJxa(0)).toBe('0')
    expect(numberCoercer.toJxa(-5)).toBe('-5')
  })

  it('should convert from number', () => {
    expect(numberCoercer.fromJxa(42)).toBe(42)
    expect(numberCoercer.fromJxa(3.14)).toBe(3.14)
  })

  it('should convert from string', () => {
    expect(numberCoercer.fromJxa('42')).toBe(42)
    expect(numberCoercer.fromJxa('3.14')).toBe(3.14)
  })

  it('should throw for invalid string', () => {
    expect(() => numberCoercer.fromJxa('not-a-number')).toThrow('Cannot coerce string to number')
  })

  it('should throw for object', () => {
    expect(() => numberCoercer.fromJxa({})).toThrow('Cannot coerce object to number')
  })
})

describe('stringCoercer', () => {
  it('should JSON stringify string', () => {
    expect(stringCoercer.toJxa('hello')).toBe('"hello"')
  })

  it('should escape special characters', () => {
    expect(stringCoercer.toJxa('hello\nworld')).toBe('"hello\\nworld"')
  })

  it('should escape quotes', () => {
    expect(stringCoercer.toJxa('say "hello"')).toBe('"say \\"hello\\""')
  })

  it('should escape backslashes', () => {
    expect(stringCoercer.toJxa('path\\to\\file')).toBe('"path\\\\to\\\\file"')
  })

  it('should convert to string', () => {
    expect(stringCoercer.fromJxa('hello')).toBe('hello')
    expect(stringCoercer.fromJxa(123)).toBe('123')
  })

  it('should convert null to empty string', () => {
    expect(stringCoercer.fromJxa(null)).toBe('')
  })

  it('should convert undefined to empty string', () => {
    expect(stringCoercer.fromJxa(undefined)).toBe('')
  })
})

describe('createArrayCoercer', () => {
  const numberArrayCoercer = createArrayCoercer(numberCoercer)

  it('should convert array to JXA', () => {
    expect(numberArrayCoercer.toJxa([1, 2, 3])).toBe('[1, 2, 3]')
  })

  it('should convert empty array to JXA', () => {
    expect(numberArrayCoercer.toJxa([])).toBe('[]')
  })

  it('should convert from array', () => {
    expect(numberArrayCoercer.fromJxa([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('should convert from empty array', () => {
    expect(numberArrayCoercer.fromJxa([])).toEqual([])
  })

  it('should throw for non-array', () => {
    expect(() => numberArrayCoercer.fromJxa('not-array')).toThrow('Expected array')
  })

  it('should throw for object', () => {
    expect(() => numberArrayCoercer.fromJxa({})).toThrow('Expected array')
  })
})

describe('createArrayCoercer with strings', () => {
  const stringArrayCoercer = createArrayCoercer(stringCoercer)

  it('should convert string array to JXA', () => {
    expect(stringArrayCoercer.toJxa(['a', 'b', 'c'])).toBe('["a", "b", "c"]')
  })

  it('should handle special characters in string arrays', () => {
    expect(stringArrayCoercer.toJxa(['hello\nworld', 'test'])).toBe('["hello\\nworld", "test"]')
  })
})

describe('nullSafe', () => {
  const safeDateCoercer = nullSafe(dateCoercer)

  it('should handle null', () => {
    expect(safeDateCoercer.toJxa(null)).toBe('null')
    expect(safeDateCoercer.fromJxa(null)).toBeNull()
  })

  it('should handle undefined', () => {
    expect(safeDateCoercer.toJxa(undefined)).toBe('null')
    expect(safeDateCoercer.fromJxa(undefined)).toBeUndefined()
  })

  it('should delegate non-null values', () => {
    const date = new Date('2024-01-01T00:00:00.000Z')
    expect(safeDateCoercer.toJxa(date)).toBe('new Date("2024-01-01T00:00:00.000Z")')
  })

  it('should delegate non-null fromJxa', () => {
    const result = safeDateCoercer.fromJxa('2024-01-01T00:00:00.000Z')
    expect(result).toBeInstanceOf(Date)
  })
})

describe('nullSafe with string', () => {
  const safeStringCoercer = nullSafe(stringCoercer)

  it('should handle null in string context', () => {
    expect(safeStringCoercer.toJxa(null)).toBe('null')
    expect(safeStringCoercer.fromJxa(null)).toBeNull()
  })

  it('should handle valid string', () => {
    expect(safeStringCoercer.toJxa('hello')).toBe('"hello"')
    expect(safeStringCoercer.fromJxa('hello')).toBe('hello')
  })
})
