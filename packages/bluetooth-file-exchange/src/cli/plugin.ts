import type { CliPlugin } from '@macts/cli'
import { BrowseCommand } from './commands/browse.js'
import { SendCommand } from './commands/send.js'

/**
 * CLI plugin for Bluetooth File Exchange.
 */
export const plugin: CliPlugin = {
  name: 'bluetooth-file-exchange',
  description: 'Commands for Bluetooth File Exchange',
  commands: [BrowseCommand, SendCommand],
}
