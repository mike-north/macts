/** Environment isolation for built-package consumer processes in key-store tests. */

/** Keep the native-process guard while excluding settings belonging to the test runner. */
export function childEnvironment(parent: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...parent }
  delete env['NODE_OPTIONS']
  delete env['NODE_NO_WARNINGS']
  delete env['MACTS_API_KEY_SECRET']
  const imports = parent['NODE_OPTIONS']?.matchAll(/(?:^|\s)--import(?:=|\s+)(?:"([^"]*)"|(\S+))/g)
  for (const match of imports ?? []) {
    const target = match[1] ?? match[2] ?? ''
    if (target.split(/[\\/]/).pop() === 'macts-nonnative-process-guard.mjs') {
      env['NODE_OPTIONS'] = `--import ${JSON.stringify(target)}`
      break
    }
  }
  return env
}
