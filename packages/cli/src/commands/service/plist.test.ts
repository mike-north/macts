import { describe, it, expect } from 'vitest'
import { generatePlist, escapeXml } from './plist.js'

describe('escapeXml', () => {
  it('should escape ampersands', () => {
    expect(escapeXml('foo & bar')).toBe('foo &amp; bar')
  })

  it('should escape angle brackets', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;')
  })

  it('should escape quotes', () => {
    expect(escapeXml('"hello" \'world\'')).toBe('&quot;hello&quot; &apos;world&apos;')
  })

  it('should handle strings with no special characters', () => {
    expect(escapeXml('plain text')).toBe('plain text')
  })

  it('should handle empty strings', () => {
    expect(escapeXml('')).toBe('')
  })

  it('should escape multiple special characters in sequence', () => {
    expect(escapeXml('a&b<c>d"e\'f')).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f')
  })
})

describe('generatePlist', () => {
  it('should generate valid plist XML with required options', () => {
    const result = generatePlist({
      label: 'com.macts.server',
      program: '/usr/local/bin/macts',
      logDir: '/Users/test/.macts/logs',
    })

    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain('<string>com.macts.server</string>')
    expect(result).toContain('<string>/usr/local/bin/macts</string>')
    expect(result).toContain('<string>--serve</string>')
    expect(result).toContain('<true/>')
    expect(result).toContain('/Users/test/.macts/logs/macts.stdout.log')
    expect(result).toContain('/Users/test/.macts/logs/macts.stderr.log')
    expect(result).not.toContain('EnvironmentVariables')
    expect(result).not.toContain('MACTS_PORT')
  })

  it('should include port in program arguments and environment when specified', () => {
    const result = generatePlist({
      label: 'com.macts.server',
      program: '/usr/local/bin/macts',
      logDir: '/Users/test/.macts/logs',
      port: 3000,
    })

    expect(result).toContain('<string>--port</string>')
    expect(result).toContain('<string>3000</string>')
    expect(result).toContain('EnvironmentVariables')
    expect(result).toContain('<key>MACTS_PORT</key>')
  })

  it('should include additional args in program arguments', () => {
    const result = generatePlist({
      label: 'com.macts.server',
      program: '/usr/local/bin/macts',
      args: ['--verbose', '--config', '/etc/macts.json'],
      logDir: '/Users/test/.macts/logs',
    })

    expect(result).toContain('<string>--verbose</string>')
    expect(result).toContain('<string>--config</string>')
    expect(result).toContain('<string>/etc/macts.json</string>')
  })

  it('should escape XML special characters in all fields', () => {
    const result = generatePlist({
      label: 'com.macts.server',
      program: '/path/with<special>&chars',
      logDir: '/logs/"dir"',
    })

    expect(result).toContain('/path/with&lt;special&gt;&amp;chars')
    expect(result).toContain('/logs/&quot;dir&quot;')
  })

  it('should not include port environment when port is omitted', () => {
    const result = generatePlist({
      label: 'com.macts.server',
      program: '/usr/local/bin/macts',
      logDir: '/Users/test/.macts/logs',
    })

    expect(result).not.toContain('EnvironmentVariables')
    expect(result).not.toContain('--port')
  })

  it('should produce well-formed XML structure', () => {
    const result = generatePlist({
      label: 'com.macts.server',
      program: '/usr/local/bin/macts',
      logDir: '/Users/test/.macts/logs',
    })

    // Check basic XML structure
    expect(result).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/)
    expect(result).toContain('<!DOCTYPE plist')
    expect(result).toContain('<plist version="1.0">')
    expect(result).toMatch(/<\/plist>$/)
    // Verify it starts with dict and ends with dict
    expect(result).toContain('<dict>')
    expect(result).toContain('</dict>')
  })

  it('should use empty array as default for args', () => {
    const result = generatePlist({
      label: 'com.macts.server',
      program: '/usr/local/bin/macts',
      logDir: '/Users/test/.macts/logs',
    })

    // Should have program and --serve but no extra args
    const programArgsSection = result.slice(
      result.indexOf('<array>'),
      result.indexOf('</array>') + '</array>'.length
    )
    const stringMatches = programArgsSection.match(/<string>/g)
    // Two entries: the program path and --serve
    expect(stringMatches).toHaveLength(2)
  })
})
