/**
 * Coverage of the committed API reference in `docs/`.
 *
 * Every public export recorded in an API report
 * (`packages/<name>/api-report/*.api.md`) must have a page in `docs/`. A
 * package can publish several entry points (its root and subpaths such as
 * `@macts/sdk/local`), and each has its own report, so the reference lists one
 * entry page per entry point. These tests read the committed tree: each
 * report's exports must all be members of one of its package's entry pages,
 * and every member link must name a page that documents that member: the page
 * exists, its breadcrumb ends in the member's name and its heading names the
 * member's kind (`## ArcClient class`). A link that merely resolves is not
 * enough, because a page written for another member would satisfy it: one
 * whose name differs only in case, or another declaration of the same name
 * (TypeScript merges a class and an interface, or a constant and a type,
 * named alike, and API Extractor documents each). An export is therefore
 * identified by its name and its kind, and an entry page lists it in the
 * table for its kind (`## Classes`, `## Interfaces`, ...). A subpath entry page is
 * titled with the subpath's import path, which must be one the package
 * declares in its `exports`.
 *
 * The command-line (`cli`) and MCP (`mcp`) packages are not part of the
 * library reference and are left out.
 *
 * @see https://github.com/mike-north/macts/issues/335
 * @see https://api-extractor.com/pages/setup/configure_api_report/
 * @see https://nodejs.org/api/packages.html#subpath-exports
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(process.cwd(), '../..')
const DOCS_DIR = join(REPO_ROOT, 'docs')
const PACKAGES_DIR = join(REPO_ROOT, 'packages')

/** Packages whose API is not part of the library reference. */
const EXCLUDED = new Set(['@macts/cli', '@macts/mcp'])

/**
 * The kind of declaration, in the word api-documenter puts in a page's
 * heading (`## Integer variable`, `## Integer type`).
 */
type DeclarationKind =
  | 'class'
  | 'interface'
  | 'variable'
  | 'type'
  | 'function'
  | 'enum'
  | 'namespace'

/** The declaration keyword an API report uses for each kind. */
const REPORT_KINDS: Record<string, DeclarationKind> = {
  class: 'class',
  'abstract class': 'class',
  interface: 'interface',
  const: 'variable',
  let: 'variable',
  var: 'variable',
  type: 'type',
  function: 'function',
  enum: 'enum',
  namespace: 'namespace',
}

/** The table an entry page lists each kind in, by its `##` heading. */
const SECTION_KINDS: Record<string, DeclarationKind> = {
  Classes: 'class',
  'Abstract Classes': 'class',
  Interfaces: 'interface',
  Variables: 'variable',
  'Type Aliases': 'type',
  Functions: 'function',
  Enumerations: 'enum',
  Namespaces: 'namespace',
}

/** The key of one declaration: its name and kind (`ArcClient|class`). */
function declarationKey(name: string, kind: DeclarationKind): string {
  return `${name}|${kind}`
}

/**
 * One export recorded in an API report. A local export is documented on the
 * report's own entry page, under the name API Extractor gives the declaration
 * (`export { Event_2 as Event }` is documented as `Event_2`). A re-export of
 * another entry point's symbol (`import { VERSION } from '@macts/core'` then
 * `export { VERSION }`) is documented on that entry point's page.
 */
interface ReportedExport {
  /** The name the report exports. */
  name: string
  /** The name of the page member that documents it. */
  member: string
  /**
   * The kinds the report declares the member as: one, or several for a merged
   * declaration. Empty for a re-export, whose kinds the source entry page gives.
   */
  kinds: DeclarationKind[]
  /** The import path of the entry point that declares it, when it is not this one. */
  from?: string
}

/** One package's reports, by report file name. */
interface ReportedPackage {
  name: string
  dir: string
  exports: Record<string, unknown>
  reports: Map<string, ReportedExport[]>
}

/** The names a report imports from other entry points: local name to its source and original name. */
function importedNames(report: string): Map<string, { from: string; name: string }> {
  const imported = new Map<string, { from: string; name: string }>()
  for (const match of report.matchAll(/^import \{([^}]*)\} from '([^']+)';/gm)) {
    for (const part of (match[1] ?? '').split(',')) {
      const [original, local = original] = part.trim().split(/\s+as\s+/)
      if (original && local) imported.set(local, { from: match[2] ?? '', name: original })
    }
  }
  return imported
}

/**
 * The top-level declarations of an API report, exported or not, by name: the
 * kinds each name is declared as. A report writes a declaration that an export
 * list exports without `export` (`interface Event_2 {`).
 */
function declaredKinds(report: string): Map<string, Set<DeclarationKind>> {
  const declared = new Map<string, Set<DeclarationKind>>()
  const declaration =
    /^(?:export )?(?:declare )?(abstract class|class|const|let|var|function|interface|type|enum|namespace) ([A-Za-z0-9_$]+)/gm
  for (const match of report.matchAll(declaration)) {
    const kind = REPORT_KINDS[match[1] ?? '']
    const name = match[2] ?? ''
    if (kind === undefined) continue
    const kinds = declared.get(name) ?? new Set<DeclarationKind>()
    kinds.add(kind)
    declared.set(name, kinds)
  }
  return declared
}

/**
 * The exports an API report records: declarations (`export declare function
 * x`, `export interface X`, ...) and export lists (`export { x, y as z }`).
 * A name declared more than once (a class and an interface `ArcClient`) is
 * one export with several kinds.
 */
function reportedExports(report: string): ReportedExport[] {
  const exports = new Map<string, ReportedExport>()
  const declared = declaredKinds(report)
  const kindsOf = (name: string): DeclarationKind[] => [...(declared.get(name) ?? [])].sort()
  const declaration =
    /^export (?:declare )?(?:abstract )?(?:class|const|let|var|function|interface|type|enum|namespace) ([A-Za-z0-9_$]+)/gm
  for (const match of report.matchAll(declaration)) {
    const name = match[1] ?? ''
    exports.set(name, { name, member: name, kinds: kindsOf(name) })
  }
  const imported = importedNames(report)
  for (const match of report.matchAll(/^export \{([^}]*)\}/gm)) {
    for (const part of (match[1] ?? '').split(',')) {
      const [local, name = local] = part.trim().split(/\s+as\s+/)
      if (!local || !name) continue
      const source = imported.get(local)
      exports.set(
        name,
        source === undefined
          ? { name, member: local, kinds: kindsOf(local) }
          : { name, member: source.name, kinds: [], from: source.from }
      )
    }
  }
  return [...exports.values()]
}

function reportedPackages(): ReportedPackage[] {
  const packages: ReportedPackage[] = []
  for (const dir of readdirSync(PACKAGES_DIR).sort()) {
    const reportDir = join(PACKAGES_DIR, dir, 'api-report')
    if (!existsSync(reportDir)) continue
    const manifest = JSON.parse(readFileSync(join(PACKAGES_DIR, dir, 'package.json'), 'utf-8')) as {
      name: string
      exports?: Record<string, unknown>
    }
    if (EXCLUDED.has(manifest.name)) continue
    const reports = new Map<string, ReportedExport[]>()
    for (const file of readdirSync(reportDir).sort()) {
      if (!file.endsWith('.api.md')) continue
      reports.set(file, reportedExports(readFileSync(join(reportDir, file), 'utf-8')))
    }
    packages.push({ name: manifest.name, dir, exports: manifest.exports ?? {}, reports })
  }
  return packages
}

/** The entry pages the reference index lists: display name to page file. */
function entryPages(): Map<string, string> {
  const index = readFileSync(join(DOCS_DIR, 'index.md'), 'utf-8')
  const pages = new Map<string, string>()
  for (const match of index.matchAll(/\[(@[^\]]+)\]\(\.\/([^)]+\.md)\)/g)) {
    pages.set(match[1] ?? '', match[2] ?? '')
  }
  return pages
}

/**
 * The members an entry page links to, by declaration key (`ArcClient|class`)
 * to page file. A member's kind is the table it is listed in.
 */
function entryMembers(page: string): Map<string, string> {
  const content = readFileSync(join(DOCS_DIR, page), 'utf-8')
  const members = new Map<string, string>()
  let kind: DeclarationKind | undefined
  for (const line of content.split('\n')) {
    const section = /^## (.+)$/.exec(line)?.[1]
    if (section !== undefined) kind = SECTION_KINDS[section]
    const link = /^\[([A-Za-z0-9_$]+)(?:\([^)]*\))?\]\(\.\/([^)]+\.md)\)/.exec(line)
    if (link !== null && kind !== undefined) {
      members.set(declarationKey(link[1] ?? '', kind), link[2] ?? '')
    }
  }
  return members
}

/** The names an entry page lists, with every kind each is listed as. */
function memberKinds(members: Map<string, string>): Map<string, DeclarationKind[]> {
  const kinds = new Map<string, DeclarationKind[]>()
  for (const key of members.keys()) {
    const [name, kind] = key.split('|') as [string, DeclarationKind]
    kinds.set(name, [...(kinds.get(name) ?? []), kind])
  }
  return kinds
}

/**
 * The declaration a page documents: the last segment of its breadcrumb
 * (`[Home](./index.md) &gt; [@macts/core](./core.md) &gt; [Name](./core.name.md)`)
 * and the kind word that ends its heading (`## Name interface`), as a
 * declaration key; `undefined` for a missing page or one without either.
 */
function documentedDeclaration(page: string): string | undefined {
  const path = join(DOCS_DIR, page)
  if (!existsSync(path)) return undefined
  const content = readFileSync(path, 'utf-8')
  const breadcrumb = /^\[Home\]\(\.\/index\.md\).*$/m.exec(content)?.[0]
  const heading = /^## .* ([a-z]+)$/m.exec(content)?.[1]
  if (breadcrumb === undefined || heading === undefined) return undefined
  const name = [...breadcrumb.matchAll(/\[([^\]]+)\]\(\.\/[^)]+\.md\)/g)].at(-1)?.[1]
  return name === undefined ? undefined : `${name}|${heading}`
}

/** The entry pages of one package: its root (`@macts/x`) and its subpaths (`@macts/x/...`). */
function packageEntryPages(name: string, pages: Map<string, string>): Map<string, string> {
  return new Map(
    [...pages].filter(([display]) => display === name || display.startsWith(`${name}/`))
  )
}

describe('API reference coverage', () => {
  const packages = reportedPackages()
  const pages = entryPages()

  it('finds API reports to check', () => {
    expect(packages.length).toBeGreaterThan(0)
  })

  it('gives every export of every API report a page of its own on one of its package entry pages', () => {
    const missing: string[] = []
    for (const pkg of packages) {
      const entries = [...packageEntryPages(pkg.name, pages).values()].map(entryMembers)
      for (const [report, reported] of pkg.reports) {
        const local = reported.filter((entry) => entry.from === undefined)
        // A report describes one entry point, so one entry page must hold all its local exports.
        const coverage = (members: Map<string, string>): number =>
          local.filter((entry) =>
            entry.kinds.some((kind) => members.has(declarationKey(entry.member, kind)))
          ).length
        const own = entries.reduce<Map<string, string> | undefined>(
          (chosen, members) =>
            chosen === undefined || coverage(members) > coverage(chosen) ? members : chosen,
          undefined
        )
        for (const entry of reported) {
          const sourcePage = entry.from === undefined ? undefined : pages.get(entry.from)
          const members =
            entry.from === undefined
              ? own
              : sourcePage === undefined
                ? undefined
                : entryMembers(sourcePage)
          // A re-export has the kinds its source entry page lists it as.
          const kinds =
            entry.from === undefined
              ? entry.kinds
              : ((members === undefined ? undefined : memberKinds(members).get(entry.member)) ?? [])
          if (kinds.length === 0) missing.push(`${pkg.dir}/api-report/${report}: ${entry.name}`)
          for (const kind of kinds) {
            const key = declarationKey(entry.member, kind)
            const page = members?.get(key)
            if (page === undefined || documentedDeclaration(page) !== key) {
              missing.push(`${pkg.dir}/api-report/${report}: ${entry.name} (${kind})`)
            }
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('titles each subpath entry page with an import path its package exports', () => {
    const undeclared: string[] = []
    for (const pkg of packages) {
      for (const display of packageEntryPages(pkg.name, pages).keys()) {
        if (display === pkg.name) continue
        const subpath = `.${display.slice(pkg.name.length)}`
        if (!(subpath in pkg.exports)) undeclared.push(display)
      }
    }
    expect(undeclared).toEqual([])
  })
})
