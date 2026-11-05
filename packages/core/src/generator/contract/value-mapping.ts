/**
 * Mapping from manifest types to value types, for generated app contracts.
 *
 * Every field, parameter, and result in a generated contract is described by a
 * value type composed from the `ValueTypes` constructors of `@macts/contracts`
 * (conventionally aliased `t`). Which composition a manifest type maps to is
 * decided from the manifest (`../../manifest/value-shapes.ts`); this module
 * renders it twice: as the constructor expression (`t.array(t.date())`) and
 * as the SDK type callers see (`readonly Date[]`).
 * It also builds the same composition in process, with the same constructors
 * ({@link ValueBuilder}), so the generator can derive data from the value type
 * the emitted expression will construct, such as its wire JSON Schema. All
 * three come from one {@link ValueShape}, so the expression, the declared
 * type, and the built value type cannot disagree.
 *
 * A file-like type is a {@link FileValue} where an operation returns it and a
 * file source where an operation consumes it, and a name that resolves to
 * nothing renders as `t.unknown()`.
 *
 * @packageDocumentation
 */

import {
  ValueTypes as t,
  type ReferenceScope,
  type ValueType,
  type ValueTypeOptions,
} from '@macts/contracts'
import type { ValuePosition, ValueShape } from '../../manifest/value-shapes.js'

// Which composition a declared type maps to is manifest knowledge
// (../../manifest/value-shapes.ts); this module renders and builds it. The
// mapping is re-exported here for the generators that render it.
export {
  createNameResolver,
  mapDeclaredType,
  nullableShape,
  type LeafKind,
  type MappedType,
  type NameResolver,
  type ValuePosition,
  type ValueShape,
} from '../../manifest/value-shapes.js'

/**
 * The `@macts/contracts` type names that rendered SDK types can refer to. A
 * renderer records each one it uses, so the generated module imports exactly
 * those.
 */
export type ContractTypeName =
  | 'Integer'
  | 'Point'
  | 'Rectangle'
  | 'Rgb'
  | 'FileValue'
  | 'FileSource'
  | 'ObjectReferenceVariant'
  | 'ObjectReferenceData'
  | 'IndexSelectorReference'

/** What rendering needs to know about the generated module around it. */
export interface RenderContext {
  /** The binding of the enum's members tuple, e.g. `eventStatusMembers`. */
  enumMembers(enumKey: string): string
  /** The generated record interface of a resource. */
  recordInterface(resourceKey: string): string
  /**
   * The identifier composition of a resource, or `undefined` when the
   * resource has no identifier.
   */
  identifier(resourceKey: string): ValueShape | undefined
  /**
   * The binding of the app contract, which references read lazily as their
   * scope: the app they belong to and its resource table.
   */
  readonly scopeBinding: string
}

/**
 * Renders value shapes as constructor expressions and SDK types, recording
 * which enum member tuples and contract types the output uses.
 */
export class ValueRenderer {
  readonly #context: RenderContext
  readonly #usedEnums = new Set<string>()
  readonly #usedTypes = new Set<ContractTypeName>()

  constructor(context: RenderContext) {
    this.#context = context
  }

  /** Enum keys whose member tuples rendered expressions refer to. */
  get usedEnums(): ReadonlySet<string> {
    return this.#usedEnums
  }

  /** Contract type names that rendered SDK types refer to. */
  get usedTypes(): ReadonlySet<ContractTypeName> {
    return this.#usedTypes
  }

  /**
   * The constructor expression of `shape`, e.g.
   * `t.array(t.date(), { description: 'Due dates' })`. A description, when
   * given, is attached to the outermost value type.
   */
  expression(shape: ValueShape, description?: string): string {
    const options =
      description === undefined ? '' : `{ description: ${stringLiteral(description)} }`
    const withOptions = (args: string): string =>
      options === '' ? args : args === '' ? options : `${args}, ${options}`
    switch (shape.kind) {
      case 'string':
      case 'boolean':
      case 'integer':
      case 'double':
      case 'date':
      case 'point':
      case 'rectangle':
      case 'rgb':
      case 'file':
      case 'fileSource':
      case 'unknown':
        return `t.${shape.kind}(${withOptions('')})`
      case 'enum':
        this.#usedEnums.add(shape.enumKey)
        return `t.enumeration(${withOptions(this.#context.enumMembers(shape.enumKey))})`
      case 'array':
        return `t.array(${withOptions(this.expression(shape.item))})`
      case 'nullable':
        return `t.nullable(${withOptions(this.expression(shape.inner))})`
      case 'reference': {
        const key = stringLiteral(shape.resourceKey)
        if (shape.form === 'index') {
          const record = this.#context.recordInterface(shape.resourceKey)
          const args = `() => ${this.#context.scopeBinding}, ${key}`
          return `t.indexSelectorReference<${record}, ${key}>(${withOptions(args)})`
        }
        const typeArgs = this.#referenceTypeArguments(shape.resourceKey)
        const args = `() => ${this.#context.scopeBinding}, ${key}, 'one'`
        return `t.reference<${typeArgs}>(${withOptions(args)})`
      }
    }
  }

  /**
   * The SDK type of `shape` at `position`, e.g. `readonly Date[]`.
   *
   * @remarks
   * Only references differ by position. An output holds a bound reference
   * (`ObjectReferenceVariant<Record, Id, 'Key'>`), which a client decoded and
   * can resolve. An input takes the data form
   * (`ObjectReferenceData<Id, 'Key'>`), so a caller can pass a reference it
   * built, in either form, or one it received. The resource key is a literal
   * type in both, so a reference to another resource does not type-check. An
   * output emitted as an index selector within its container (`form:
   * 'index'`) holds the narrower `IndexSelectorReference<Record, 'Key'>`.
   */
  sdkType(shape: ValueShape, position: ValuePosition): string {
    return this.#sdkType(shape, position, new Set())
  }

  #sdkType(shape: ValueShape, position: ValuePosition, visiting: ReadonlySet<string>): string {
    switch (shape.kind) {
      case 'string':
      case 'boolean':
      case 'unknown':
        return shape.kind
      case 'double':
        return 'number'
      case 'date':
        return 'Date'
      case 'integer':
        return this.#use('Integer')
      case 'point':
        return this.#use('Point')
      case 'rectangle':
        return this.#use('Rectangle')
      case 'rgb':
        return this.#use('Rgb')
      case 'file':
        return this.#use('FileValue')
      case 'fileSource':
        return this.#use('FileSource')
      case 'enum':
        return shape.enumKey
      case 'array': {
        const item = this.#sdkType(shape.item, position, visiting)
        const grouped = item.startsWith('readonly ') || item.endsWith(' | null')
        return `readonly ${grouped ? `(${item})` : item}[]`
      }
      case 'nullable':
        return `${this.#sdkType(shape.inner, position, visiting)} | null`
      case 'reference': {
        const key = stringLiteral(shape.resourceKey)
        if (position === 'output' && shape.form === 'index') {
          return `${this.#use('IndexSelectorReference')}<${this.#context.recordInterface(shape.resourceKey)}, ${key}>`
        }
        const id = this.#identifierType(shape.resourceKey, visiting)
        return position === 'output'
          ? `${this.#use('ObjectReferenceVariant')}<${this.#context.recordInterface(shape.resourceKey)}, ${id}, ${key}>`
          : `${this.#use('ObjectReferenceData')}<${id}, ${key}>`
      }
    }
  }

  /**
   * `Record, Id, 'Key'` for a reference to `resourceKey`: its record
   * interface, the SDK type of its identifier, and its key as a literal type.
   */
  #referenceTypeArguments(resourceKey: string): string {
    const record = this.#context.recordInterface(resourceKey)
    return `${record}, ${this.#identifierType(resourceKey, new Set())}, ${stringLiteral(resourceKey)}`
  }

  /**
   * The SDK type of `resourceKey`'s identifier: `never` when it has none,
   * since such a resource can be referenced only by selector. An identifier
   * is what an object returns, so it is typed as an output.
   */
  #identifierType(resourceKey: string, visiting: ReadonlySet<string>): string {
    const identifier = this.#context.identifier(resourceKey)
    if (identifier === undefined) return 'never'
    // An identifier that is itself a reference back to a resource on the
    // current path has no finite SDK type; describe it as `unknown`.
    if (visiting.has(resourceKey)) return 'unknown'
    return this.#sdkType(identifier, 'output', new Set([...visiting, resourceKey]))
  }

  #use(name: ContractTypeName): string {
    this.#usedTypes.add(name)
    return name
  }
}

/** What building needs to know about the contract around a value. */
export interface BuildContext {
  /** The members of an enum, in the order the generated tuple lists them. */
  enumMembers(enumKey: string): readonly string[]
  /**
   * The scope references read: the app's route segment and its resource
   * table, listing every resource the generated table lists, in its order,
   * with the identifier value type of each one that has an identifier. Read
   * lazily, as the generated contract is.
   */
  scope(): ReferenceScope
}

/**
 * Builds value shapes into the value types their rendered constructor
 * expressions construct.
 *
 * @remarks
 * Each case mirrors {@link ValueRenderer.expression} exactly: the same
 * constructor, the same arguments, and the description on the outermost value
 * type. A built value type is therefore indistinguishable, in its wire schema
 * and so in its JSON Schema, from the one the generated module constructs.
 */
export class ValueBuilder {
  readonly #context: BuildContext

  constructor(context: BuildContext) {
    this.#context = context
  }

  /** The value type `shape` describes, with `description` on its outermost type. */
  build(shape: ValueShape, description?: string): ValueType<unknown> {
    const options: ValueTypeOptions | undefined =
      description === undefined ? undefined : { description }
    switch (shape.kind) {
      case 'string':
        return t.string(options)
      case 'boolean':
        return t.boolean(options)
      case 'integer':
        return t.integer(options)
      case 'double':
        return t.double(options)
      case 'date':
        return t.date(options)
      case 'point':
        return t.point(options)
      case 'rectangle':
        return t.rectangle(options)
      case 'rgb':
        return t.rgb(options)
      case 'file':
        return t.file(options)
      case 'fileSource':
        return t.fileSource(options)
      case 'unknown':
        return t.unknown(options)
      case 'enum': {
        const [first, ...rest] = this.#context.enumMembers(shape.enumKey)
        if (first === undefined) throw new Error(`Enum ${shape.enumKey} has no members.`)
        return t.enumeration([first, ...rest], options)
      }
      case 'array':
        return t.array(this.build(shape.item), options)
      case 'nullable':
        return t.nullable(this.build(shape.inner), options)
      case 'reference':
        return shape.form === 'index'
          ? t.indexSelectorReference(() => this.#context.scope(), shape.resourceKey, options)
          : t.reference(() => this.#context.scope(), shape.resourceKey, 'one', options)
    }
  }
}

/**
 * A single-quoted TypeScript string literal for `value`, escaped so any text
 * (including quotes, backslashes, and line breaks) round-trips.
 */
export function stringLiteral(value: string): string {
  const escaped = JSON.stringify(value).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")
  return `'${escaped}'`
}
