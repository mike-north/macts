import type { CliPlugin } from '@macts/cli'
import { RevealCommand } from './commands/reveal.js'

/**
 * CLI plugin for System Settings.
 */
export const plugin: CliPlugin = {
  name: 'system-settings',
  description: 'Commands for System Settings',
  commands: [RevealCommand],
}
