import type { CliPlugin } from '@macts/cli'
import { ListWindowsCommand } from './commands/windows/list.js'
import { GetWindowCommand } from './commands/windows/get.js'
import { ListTabsCommand } from './commands/windows/tabs/list.js'
import { GetTabCommand } from './commands/windows/tabs/get.js'
import { ListSessionsCommand } from './commands/windows/tabs/sessions/list.js'
import { GetSessionCommand } from './commands/windows/tabs/sessions/get.js'
import { CountCommand } from './commands/count.js'
import { DeleteCommand } from './commands/delete.js'
import { DuplicateCommand } from './commands/duplicate.js'
import { ExistsCommand } from './commands/exists.js'
import { MakeCommand } from './commands/make.js'
import { MoveCommand } from './commands/move.js'
import { CloseCommand } from './commands/close.js'
import { RequestCookieCommand } from './commands/request-cookie.js'
import { CreateTabCommand } from './commands/create-tab.js'
import { CreateTabWithDefaultProfileCommand } from './commands/create-tab-with-default-profile.js'
import { CreateWindowWithProfileCommand } from './commands/create-window-with-profile.js'
import { CreateHotkeyWindowWithProfileCommand } from './commands/create-hotkey-window-with-profile.js'
import { LaunchAPIScriptNamedCommand } from './commands/launch-apiscript-named.js'
import { InvokeAPIExpressionCommand } from './commands/invoke-apiexpression.js'
import { CreateWindowWithDefaultProfileCommand } from './commands/create-window-with-default-profile.js'
import { WriteCommand } from './commands/write.js'
import { SelectCommand } from './commands/select.js'
import { SplitVerticallyCommand } from './commands/split-vertically.js'
import { SplitVerticallyWithDefaultProfileCommand } from './commands/split-vertically-with-default-profile.js'
import { SplitVerticallyWithSameProfileCommand } from './commands/split-vertically-with-same-profile.js'
import { SplitHorizontallyCommand } from './commands/split-horizontally.js'
import { SplitHorizontallyWithDefaultProfileCommand } from './commands/split-horizontally-with-default-profile.js'
import { SplitHorizontallyWithSameProfileCommand } from './commands/split-horizontally-with-same-profile.js'
import { VariableCommand } from './commands/variable.js'
import { SetVariableCommand } from './commands/set-variable.js'
import { RevealHotkeyWindowCommand } from './commands/reveal-hotkey-window.js'
import { HideHotkeyWindowCommand } from './commands/hide-hotkey-window.js'
import { ToggleHotkeyWindowCommand } from './commands/toggle-hotkey-window.js'

/**
 * CLI plugin for iTerm.
 */
export const plugin: CliPlugin = {
  name: 'iterm',
  description: 'Commands for iTerm',
  commands: [
    ListWindowsCommand,
    GetWindowCommand,
    ListTabsCommand,
    GetTabCommand,
    ListSessionsCommand,
    GetSessionCommand,
    CountCommand,
    DeleteCommand,
    DuplicateCommand,
    ExistsCommand,
    MakeCommand,
    MoveCommand,
    CloseCommand,
    RequestCookieCommand,
    CreateTabCommand,
    CreateTabWithDefaultProfileCommand,
    CreateWindowWithProfileCommand,
    CreateHotkeyWindowWithProfileCommand,
    LaunchAPIScriptNamedCommand,
    InvokeAPIExpressionCommand,
    CreateWindowWithDefaultProfileCommand,
    WriteCommand,
    SelectCommand,
    SplitVerticallyCommand,
    SplitVerticallyWithDefaultProfileCommand,
    SplitVerticallyWithSameProfileCommand,
    SplitHorizontallyCommand,
    SplitHorizontallyWithDefaultProfileCommand,
    SplitHorizontallyWithSameProfileCommand,
    VariableCommand,
    SetVariableCommand,
    RevealHotkeyWindowCommand,
    HideHotkeyWindowCommand,
    ToggleHotkeyWindowCommand,
  ],
}
