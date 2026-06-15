import type { CliPlugin } from '@macts/cli'
import { SendCommand } from './commands/send.js'
import { LoginCommand } from './commands/login.js'
import { LogoutCommand } from './commands/logout.js'

/**
 * CLI plugin for Messages.
 */
export const plugin: CliPlugin = {
  name: 'messages',
  description: 'Commands for Messages',
  commands: [SendCommand, LoginCommand, LogoutCommand],
}
