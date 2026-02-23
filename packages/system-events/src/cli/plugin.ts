import type { CliPlugin } from '@macts/cli';
import { AbortTransactionCommand } from './commands/abort-transaction.js';
import { BeginTransactionCommand } from './commands/begin-transaction.js';
import { EndTransactionCommand } from './commands/end-transaction.js';
import { ConnectCommand } from './commands/connect.js';
import { DisconnectCommand } from './commands/disconnect.js';
import { StartCommand } from './commands/start.js';
import { StopCommand } from './commands/stop.js';
import { MoveCommand } from './commands/move.js';
import { OpenCommand } from './commands/open.js';
import { LogOutCommand } from './commands/log-out.js';
import { RestartCommand } from './commands/restart.js';
import { ShutDownCommand } from './commands/shut-down.js';
import { SleepCommand } from './commands/sleep.js';
import { KeyCodeCommand } from './commands/key-code.js';
import { KeystrokeCommand } from './commands/keystroke.js';
import { AttachActionToCommand } from './commands/attach-action-to.js';
import { AttachedScriptsCommand } from './commands/attached-scripts.js';
import { CancelCommand } from './commands/cancel.js';
import { ConfirmCommand } from './commands/confirm.js';
import { DecrementCommand } from './commands/decrement.js';
import { DoFolderActionCommand } from './commands/do-folder-action.js';
import { EditActionOfCommand } from './commands/edit-action-of.js';
import { IncrementCommand } from './commands/increment.js';
import { KeyDownCommand } from './commands/key-down.js';
import { KeyUpCommand } from './commands/key-up.js';
import { PickCommand } from './commands/pick.js';
import { RemoveActionFromCommand } from './commands/remove-action-from.js';

/**
 * CLI plugin for System Events.
 */
export const plugin: CliPlugin = {
  name: 'system-events',
  description: 'Commands for System Events',
  commands: [
    AbortTransactionCommand,
    BeginTransactionCommand,
    EndTransactionCommand,
    ConnectCommand,
    DisconnectCommand,
    StartCommand,
    StopCommand,
    MoveCommand,
    OpenCommand,
    LogOutCommand,
    RestartCommand,
    ShutDownCommand,
    SleepCommand,
    KeyCodeCommand,
    KeystrokeCommand,
    AttachActionToCommand,
    AttachedScriptsCommand,
    CancelCommand,
    ConfirmCommand,
    DecrementCommand,
    DoFolderActionCommand,
    EditActionOfCommand,
    IncrementCommand,
    KeyDownCommand,
    KeyUpCommand,
    PickCommand,
    RemoveActionFromCommand,
  ],
};
