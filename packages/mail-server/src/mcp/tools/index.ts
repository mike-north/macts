/**
 * All MCP tools for mail.
 *
 * @packageDocumentation
 */

import { outgoingmessagesSendTool } from './outgoingmessages.js'
import { messagesBounceTool } from './messages.js'
import { messagesForwardTool } from './messages.js'
import { messagesRedirectTool } from './messages.js'
import { messagesReplyTool } from './messages.js'
import { appDeleteTool } from './app.js'
import { appDuplicateTool } from './app.js'
import { appMoveTool } from './app.js'
import { appCheckForNewMailTool } from './app.js'
import { appExtractNameFromTool } from './app.js'
import { appExtractAddressFromTool } from './app.js'
import { appGetURLTool } from './app.js'
import { appImportMailMailboxTool } from './app.js'
import { appMailtoTool } from './app.js'
import { appPerformMailActionWithMessagesTool } from './app.js'
import { appSynchronizeTool } from './app.js'

/**
 * All MCP tools.
 */
export const allTools = [
  outgoingmessagesSendTool,
  messagesBounceTool,
  messagesForwardTool,
  messagesRedirectTool,
  messagesReplyTool,
  appDeleteTool,
  appDuplicateTool,
  appMoveTool,
  appCheckForNewMailTool,
  appExtractNameFromTool,
  appExtractAddressFromTool,
  appGetURLTool,
  appImportMailMailboxTool,
  appMailtoTool,
  appPerformMailActionWithMessagesTool,
  appSynchronizeTool,
] as const
