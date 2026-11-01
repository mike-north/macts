/**
 * Tests for the removed trusted-caller switch.
 *
 * The flag and the environment variable are both gone, and neither may be
 * silently ignored (phases/13 A1, D5: there is no trusted-caller mode). The
 * flag must fail with clipanion's own unknown-option error, followed by the
 * replacement; the environment variable must produce a warning.
 *
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (A1, D5)
 */

import { Writable } from 'node:stream'
import { Cli } from 'clipanion'
import { describe, expect, it } from 'vitest'
import { RootCommand } from './commands/root.js'
import { McpServeCommand } from './commands/mcp/serve.js'
import {
  MactsCli,
  REMOVED_TRUST_SWITCH_ENV_WARNING,
  REMOVED_TRUST_SWITCH_HINT,
  explainRemovedOptions,
  warnIfRemovedTrustSwitchSet,
} from './removed-options.js'

/** A stream that keeps what is written to it. */
function capture(): { stream: Writable; text: () => string } {
  let text = ''
  const stream = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      text += chunk.toString()
      callback()
    },
  })
  return { stream, text: () => text }
}

/** Run `args` through a CLI with the MCP host commands, capturing stdout. */
async function run(cli: Cli, args: string[]): Promise<{ code: number; stdout: string }> {
  cli.register(RootCommand)
  cli.register(McpServeCommand)
  const stdout = capture()
  const stderr = capture()
  const code = await cli.run(args, { stdout: stdout.stream, stderr: stderr.stream })
  return { code, stdout: stdout.text() }
}

describe('MactsCli', () => {
  it.each([
    [['mcp', 'serve', '--disable-api-key-validation']],
    [['mcp', 'serve', '--port', '3000', '--disable-api-key-validation']],
    [['mcp', 'serve', '--disable-api-key-validation=1']],
  ])('refuses %j with clipanion’s unknown-option error and the replacement', async (args) => {
    const plain = await run(new Cli({ binaryName: 'macts' }), args)
    const macts = await run(new MactsCli({ binaryName: 'macts' }), args)

    expect(macts.code).toBe(1)
    // Clipanion's own error is kept whole, then the hint follows it.
    expect(plain.stdout).toContain('Unknown Syntax Error')
    expect(plain.stdout).toContain('option name ("--disable-api-key-validation')
    expect(macts.stdout.startsWith(plain.stdout)).toBe(true)
    expect(macts.stdout.endsWith(`\n${REMOVED_TRUST_SWITCH_HINT}\n`)).toBe(true)
  })

  it('refuses `--mcp --disable-api-key-validation` and names the replacement', async () => {
    const { code, stdout } = await run(new MactsCli({ binaryName: 'macts' }), [
      '--mcp',
      '--disable-api-key-validation',
    ])

    expect(code).toBe(1)
    expect(stdout).toContain('Unknown Syntax Error')
    expect(stdout).toContain(REMOVED_TRUST_SWITCH_HINT)
    expect(REMOVED_TRUST_SWITCH_HINT).toContain('macts api-key create')
    expect(REMOVED_TRUST_SWITCH_HINT).toContain('MACTS_API_KEY')
  })

  it('adds nothing to an unrelated unknown option', async () => {
    const plain = await run(new Cli({ binaryName: 'macts' }), ['mcp', 'serve', '--bogus'])
    const macts = await run(new MactsCli({ binaryName: 'macts' }), ['mcp', 'serve', '--bogus'])

    expect(macts.stdout).toBe(plain.stdout)
    expect(macts.stdout).not.toContain(REMOVED_TRUST_SWITCH_HINT)
  })
})

describe('explainRemovedOptions', () => {
  it('leaves errors that are not syntax errors alone, even if their text names the flag', () => {
    const error = new Error('--disable-api-key-validation')

    expect(explainRemovedOptions(error, 'rendered\n')).toBe('rendered\n')
  })
})

describe('warnIfRemovedTrustSwitchSet', () => {
  it('warns when the variable is set, to any value', () => {
    for (const value of ['1', '0', '']) {
      const stderr = capture()
      warnIfRemovedTrustSwitchSet({ MACTS_DISABLE_API_KEY_VALIDATION: value }, stderr.stream)
      expect(stderr.text()).toBe(`${REMOVED_TRUST_SWITCH_ENV_WARNING}\n`)
    }
  })

  it('says it has no effect and what to do instead', () => {
    expect(REMOVED_TRUST_SWITCH_ENV_WARNING).toContain('no longer has any effect')
    expect(REMOVED_TRUST_SWITCH_ENV_WARNING).toContain('macts api-key create')
  })

  it('is silent when the variable is unset', () => {
    const stderr = capture()
    warnIfRemovedTrustSwitchSet({}, stderr.stream)
    expect(stderr.text()).toBe('')
  })
})
