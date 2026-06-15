import type { CliPlugin } from '@macts/cli'
import { AddReadingListItemCommand } from './commands/add-reading-list-item.js'
import { DoJavaScriptCommand } from './commands/do-java-script.js'
import { EmailContentsCommand } from './commands/email-contents.js'
import { SearchTheWebCommand } from './commands/search-the-web.js'
import { ShowBookmarksCommand } from './commands/show-bookmarks.js'
import { ShowExtensionsPreferencesCommand } from './commands/show-extensions-preferences.js'
import { DispatchMessageToExtensionCommand } from './commands/dispatch-message-to-extension.js'
import { SyncAllPlistToDiskCommand } from './commands/sync-all-plist-to-disk.js'
import { ShowPrivacyReportCommand } from './commands/show-privacy-report.js'
import { ShowCreditCardSettingsCommand } from './commands/show-credit-card-settings.js'

/**
 * CLI plugin for Safari.
 */
export const plugin: CliPlugin = {
  name: 'safari',
  description: 'Commands for Safari',
  commands: [
    AddReadingListItemCommand,
    DoJavaScriptCommand,
    EmailContentsCommand,
    SearchTheWebCommand,
    ShowBookmarksCommand,
    ShowExtensionsPreferencesCommand,
    DispatchMessageToExtensionCommand,
    SyncAllPlistToDiskCommand,
    ShowPrivacyReportCommand,
    ShowCreditCardSettingsCommand,
  ],
}
