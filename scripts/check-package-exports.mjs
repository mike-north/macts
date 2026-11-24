/** Verify that every published export condition names a built file. */
import { getPackages } from '@manypkg/get-packages'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const { packages } = await getPackages(process.cwd())
const errors = []
let checked = 0

// Conditions may nest; the `types` condition applies to every descendant.
async function check(value, pkg, conditions = [], isTypes = false) {
  if (value === null) return
  if (typeof value === 'string') {
    checked++
    if (!value.startsWith('./') || value.includes('*')) {
      errors.push(`${pkg.packageJson.name} ${conditions.join(' ')}: unsupported target ${value}`)
      return
    }
    if (isTypes && !value.endsWith('.d.ts')) {
      errors.push(`${pkg.packageJson.name} ${conditions.join(' ')}: not a declaration: ${value}`)
    }
    try {
      if (!(await stat(path.join(pkg.dir, value))).isFile()) throw new Error('not a file')
    } catch {
      errors.push(`${pkg.packageJson.name} ${conditions.join(' ')}: missing ${value}`)
    }
    return
  }
  if (typeof value !== 'object') {
    errors.push(`${pkg.packageJson.name} ${conditions.join(' ')}: invalid export target`)
    return
  }
  for (const [key, child] of Object.entries(value)) {
    await check(child, pkg, [...conditions, key], isTypes || key === 'types')
  }
}

for (const pkg of packages) {
  if (!pkg.packageJson.private && pkg.packageJson.exports) await check(pkg.packageJson.exports, pkg)
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Verified ${checked} export targets`)
}
