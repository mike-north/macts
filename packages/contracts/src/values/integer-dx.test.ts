/**
 * Agent DX acceptance for integers, through the TypeScript compiler.
 *
 * An agent that writes a plain `number` where an `Integer` is required sees a
 * compiler diagnostic, then typically inspects the `Integer` type (the hover
 * text an editor or language server shows). This test compiles a small
 * consumer program and checks both: the diagnostic names `Integer`, the type's
 * documentation points at the explicit conversions, and the documented fix
 * compiles cleanly.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §A2 (Agent DX acceptance)
 * @see phases/13-sdk-value-and-execution-contracts.md §A9 (Integer DX)
 * @see https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const VALUES_DIR = dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = join(VALUES_DIR, '__integer-dx-fixture__.ts')

const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.Node16,
  moduleResolution: ts.ModuleResolutionKind.Node16,
  strict: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
  noEmit: true,
  types: [],
}

/** Compile `source` as a consumer module next to this package's sources. */
function compile(source: string): { program: ts.Program; fixture: ts.SourceFile } {
  const host = ts.createCompilerHost(COMPILER_OPTIONS, true)
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, ...rest) =>
    fileName === FIXTURE_PATH
      ? ts.createSourceFile(fileName, source, languageVersion, true)
      : getSourceFile(fileName, languageVersion, ...rest)
  const fileExists = host.fileExists.bind(host)
  host.fileExists = (fileName) => fileName === FIXTURE_PATH || fileExists(fileName)
  const readFile = host.readFile.bind(host)
  host.readFile = (fileName) => (fileName === FIXTURE_PATH ? source : readFile(fileName))

  const program = ts.createProgram([FIXTURE_PATH], COMPILER_OPTIONS, host)
  const fixture = program.getSourceFile(FIXTURE_PATH)
  if (fixture === undefined) throw new Error('fixture was not loaded')
  return { program, fixture }
}

function diagnosticsFor(program: ts.Program, fixture: ts.SourceFile): string[] {
  return ts
    .getPreEmitDiagnostics(program, fixture)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

const MISTAKE = `
import type { Integer } from './index.js'
declare function setCount(count: Integer): void
declare const n: number
setCount(n)
`

const FIX = `
import { Integer } from './index.js'
declare function setCount(count: Integer): void
declare const n: number
setCount(Integer.validate(n))
setCount(Integer.round(n / 3))
setCount(Integer.truncate(n / 3))
`

describe('integer agent DX', () => {
  it('reports a number-to-Integer mistake with a diagnostic that names Integer', () => {
    const { program, fixture } = compile(MISTAKE)
    const messages = diagnosticsFor(program, fixture)

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain("'number' is not assignable to parameter of type 'Integer'")
  })

  it('documents the explicit conversions on the Integer type an agent inspects', () => {
    const { program, fixture } = compile(MISTAKE)
    const checker = program.getTypeChecker()
    const reference = findTypeReference(fixture, 'Integer')
    const symbol = checker.getSymbolAtLocation(reference)
    if (symbol === undefined) throw new Error('Integer did not resolve')
    const aliased = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

    const remarks = aliased
      .getJsDocTags(checker)
      .filter((tag) => tag.name === 'remarks')
      .map((tag) => ts.displayPartsToString(tag.text))
      .join('\n')

    expect(remarks).toContain('Integer.validate')
    expect(remarks).toContain('Integer.round')
    expect(remarks).toContain('Integer.truncate')
    expect(remarks).toMatch(/do not cast/i)
  })

  it('accepts the documented fix without a cast', () => {
    const { program, fixture } = compile(FIX)

    expect(diagnosticsFor(program, fixture)).toEqual([])
    expect(FIX).not.toMatch(/\bas\b/)
  })
})

/** Find the first type reference to `name` in the fixture. */
function findTypeReference(sourceFile: ts.SourceFile, name: string): ts.Node {
  let found: ts.Node | undefined
  const visit = (node: ts.Node): void => {
    if (found !== undefined) return
    if (ts.isTypeReferenceNode(node) && node.typeName.getText(sourceFile) === name) {
      found = node.typeName
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  if (found === undefined) throw new Error(`no type reference to ${name}`)
  return found
}
