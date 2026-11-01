import type { CliPlugin } from '@macts/cli'
import { GetURLCommand } from './commands/get-url.js'

/**
 * CLI plugin for Screen Sharing.
 */
export const plugin: CliPlugin = {
  name: 'screen-sharing',
  description: 'Commands for Screen Sharing',
  commands: [GetURLCommand],
}
