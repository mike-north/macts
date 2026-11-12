/** Record the detached child at the launch boundary, before it can outlive the launcher. */
import childProcess from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import process from 'node:process'

const receipt = process.env.MACTS_TEST_CHILD_RECEIPT
delete process.env.MACTS_TEST_CHILD_RECEIPT
if (receipt) {
  const spawn = childProcess.spawn
  /** @param {string} command @param {string[]} args @param {import('node:child_process').SpawnOptions} options */
  childProcess.spawn = function (command, args, options) {
    const child = spawn(command, args, options)
    if (child.pid === undefined) throw new Error('Background child has no PID')
    try {
      writeFileSync(receipt, String(child.pid), { flag: 'wx', mode: 0o600 })
    } catch (error) {
      child.kill('SIGKILL')
      throw error
    }
    return child
  }
  syncBuiltinESMExports()
}
