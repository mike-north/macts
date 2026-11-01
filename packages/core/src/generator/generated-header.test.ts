/**
 * Tests for recognizing the generator's "do not edit" header.
 *
 * A file opens with a generated header when it starts with a doc comment that
 * holds one of the notices the emitters write. The expected notices are
 * written here by hand, as the emitters spell them.
 *
 * @see ./owned-output.ts (the bootstrap that relies on the header)
 */

import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadManifest } from '../manifest/loader.js'
import {
  SDK_GENERATED_NOTICE,
  hasGeneratedHeader,
  manifestGeneratedNotice,
} from './generated-header.js'
import { generateClientPackage } from './client/index.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

describe('generator notices', () => {
  it('spells the SDK notice as the SDK emitter writes it', () => {
    expect(SDK_GENERATED_NOTICE).toBe('Auto-generated - do not edit.')
  })

  it('names the app in the contract notice', () => {
    expect(manifestGeneratedNotice('Screen Sharing')).toBe(
      'Generated from the Screen Sharing manifest; do not edit.'
    )
  })
})

describe('hasGeneratedHeader', () => {
  it('recognizes the SDK notice in the leading doc comment', () => {
    const content = `/**
 * Connection client for Screen Sharing SDK.
 * Auto-generated - do not edit.
 */

import type { HttpClient } from '../client.js'
`
    expect(hasGeneratedHeader(content)).toBe(true)
  })

  it('recognizes the contract notice in the leading doc comment', () => {
    const content = `/**
 * The Reminders manifest, as data.
 *
 * Generated from the Reminders manifest; do not edit.
 *
 * @packageDocumentation
 */
export default {}
`
    expect(hasGeneratedHeader(content)).toBe(true)
  })

  it('does not recognize a leading doc comment without a notice', () => {
    const content = `/**
 * MCP tools for Screen-sharing.app connections operations.
 *
 * @packageDocumentation
 */
`
    expect(hasGeneratedHeader(content)).toBe(false)
  })

  it('does not recognize a file that does not open with a doc comment', () => {
    const content = `import { Command } from 'clipanion'

/**
 * Auto-generated - do not edit.
 */
`
    expect(hasGeneratedHeader(content)).toBe(false)
  })

  it('does not recognize a notice after the leading doc comment closes', () => {
    const content = `/**
 * Handwritten tests.
 */

/**
 * Auto-generated - do not edit.
 */
`
    expect(hasGeneratedHeader(content)).toBe(false)
  })

  it('does not recognize a notice that differs from the generated text', () => {
    expect(hasGeneratedHeader('/**\n * Auto-generated, do not edit.\n */\n')).toBe(false)
    expect(hasGeneratedHeader('/**\n * Generated from the  manifest; do not edit.\n */\n')).toBe(
      false
    )
    expect(hasGeneratedHeader('/**\n *Auto-generated - do not edit.\n */\n')).toBe(false)
  })

  it('does not recognize empty content', () => {
    expect(hasGeneratedHeader('')).toBe(false)
  })

  it('recognizes the files the real emitters write with a notice', async () => {
    const manifest = await loadManifest(resolve(MANIFESTS_DIR, 'reminders', 'app.yaml'))
    const { files } = generateClientPackage(manifest, {
      appName: 'reminders',
      clientPackageName: '@macts/reminders',
    })
    const headed = files
      .filter((file) => hasGeneratedHeader(file.content))
      .map((file) => file.path)
      .sort()
    // The SDK emitter's client, types and resource modules, and the contract
    // emitter's two modules, carry a notice in their leading doc comment.
    expect(headed).toEqual(
      expect.arrayContaining([
        'src/client.ts',
        'src/contract/index.ts',
        'src/contract/manifest.ts',
        'src/resources/reminder.ts',
        'src/types.ts',
      ])
    )
    // CLI commands open with their imports and carry no notice.
    expect(headed).not.toContain('src/cli/commands/reminders/list.ts')
  })
})
