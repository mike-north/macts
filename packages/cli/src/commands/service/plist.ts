/**
 * Plist generation for launchd service configuration.
 */

export interface PlistOptions {
  label: string
  program: string
  args?: string[]
  logDir: string
  port?: number
}

/**
 * Generate a launchd plist XML string from the given options.
 */
export function generatePlist(options: PlistOptions): string {
  const { label, program, args = [], logDir, port } = options

  const programArgs = [program, '--serve', ...args]
  if (port !== undefined) {
    programArgs.push('--port', String(port))
  }

  const programArgsXml = programArgs.map((a) => `      <string>${escapeXml(a)}</string>`).join('\n')

  const envDict =
    port !== undefined
      ? `
    <key>EnvironmentVariables</key>
    <dict>
      <key>MACTS_PORT</key>
      <string>${String(port)}</string>
    </dict>`
      : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${escapeXml(label)}</string>
    <key>ProgramArguments</key>
    <array>
${programArgsXml}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${escapeXml(logDir)}/macts.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${escapeXml(logDir)}/macts.stderr.log</string>${envDict}
</dict>
</plist>`
}

/**
 * Escape special XML characters in a string.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
