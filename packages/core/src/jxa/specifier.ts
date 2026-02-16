/**
 * Selector types for narrowing collections.
 */
export type Selector =
  | { type: 'id'; value: string }
  | { type: 'name'; value: string }
  | { type: 'index'; value: number }
  | { type: 'whose'; predicate: Record<string, unknown> };

/**
 * A single step in an object specifier chain.
 */
export interface SpecifierStep {
  kind: 'app' | 'collection' | 'property';
  name: string;
  selector?: Selector;
}

/**
 * Fluent builder for JXA object specifier chains.
 * Generates code like: Application('Calendar').calendars.byId('uid').events()
 */
export class ObjectSpecifier {
  private steps: SpecifierStep[] = [];

  private constructor(steps: SpecifierStep[] = []) {
    this.steps = steps;
  }

  /**
   * Start building from an application.
   */
  static app(bundleId: string): ObjectSpecifier {
    return new ObjectSpecifier([{ kind: 'app', name: bundleId }]);
  }

  /**
   * Access a collection (e.g., calendars, events).
   */
  collection(name: string): ObjectSpecifier {
    return new ObjectSpecifier([...this.steps, { kind: 'collection', name }]);
  }

  /**
   * Select item by ID.
   */
  byId(id: string): ObjectSpecifier {
    const lastStep = this.steps[this.steps.length - 1];
    if (lastStep?.kind !== 'collection') {
      throw new Error('byId() can only be called after collection()');
    }
    return new ObjectSpecifier([
      ...this.steps.slice(0, -1),
      { ...lastStep, selector: { type: 'id', value: id } },
    ]);
  }

  /**
   * Select item by name.
   */
  byName(name: string): ObjectSpecifier {
    const lastStep = this.steps[this.steps.length - 1];
    if (lastStep?.kind !== 'collection') {
      throw new Error('byName() can only be called after collection()');
    }
    return new ObjectSpecifier([
      ...this.steps.slice(0, -1),
      { ...lastStep, selector: { type: 'name', value: name } },
    ]);
  }

  /**
   * Select item by index (0-based in TypeScript, converted to 1-based for JXA).
   */
  at(index: number): ObjectSpecifier {
    const lastStep = this.steps[this.steps.length - 1];
    if (lastStep?.kind !== 'collection') {
      throw new Error('at() can only be called after collection()');
    }
    return new ObjectSpecifier([
      ...this.steps.slice(0, -1),
      { ...lastStep, selector: { type: 'index', value: index } },
    ]);
  }

  /**
   * Filter collection with a predicate.
   */
  whose(predicate: Record<string, unknown>): ObjectSpecifier {
    const lastStep = this.steps[this.steps.length - 1];
    if (lastStep?.kind !== 'collection') {
      throw new Error('whose() can only be called after collection()');
    }
    return new ObjectSpecifier([
      ...this.steps.slice(0, -1),
      { ...lastStep, selector: { type: 'whose', predicate } },
    ]);
  }

  /**
   * Access a property.
   */
  property(name: string): ObjectSpecifier {
    return new ObjectSpecifier([...this.steps, { kind: 'property', name }]);
  }

  /**
   * Generate JXA code to get the value.
   */
  toGetCode(): string {
    return this.buildChain() + (this.endsWithCollection() ? '()' : '');
  }

  /**
   * Generate JXA code to set a value.
   */
  toSetCode(value: unknown): string {
    const chain = this.buildChain();
    const valueCode = JSON.stringify(value);
    return `${chain} = ${valueCode};`;
  }

  /**
   * Generate JXA code to make a new object.
   */
  toMakeCode(properties: Record<string, unknown>): string {
    const lastStep = this.steps[this.steps.length - 1];
    if (lastStep?.kind !== 'collection') {
      throw new Error('make() can only be called on a collection');
    }

    const chain = this.buildChain();
    const propsCode = this.formatProperties(properties);
    return `${chain}.push(${propsCode});`;
  }

  /**
   * Generate JXA code to delete an object.
   */
  toDeleteCode(): string {
    return `${this.buildChain()}.delete();`;
  }

  /**
   * Get the steps for inspection.
   */
  getSteps(): readonly SpecifierStep[] {
    return this.steps;
  }

  private buildChain(): string {
    let code = '';

    for (const step of this.steps) {
      if (step.kind === 'app') {
        code = `Application("${step.name}")`;
      } else if (step.kind === 'collection') {
        code += `.${step.name}`;
        if (step.selector) {
          code += this.buildSelector(step.selector);
        }
      } else {
        // step.kind === 'property'
        code += `.${step.name}()`;
      }
    }

    return code;
  }

  private buildSelector(selector: Selector): string {
    switch (selector.type) {
      case 'id':
        return `.byId("${selector.value}")`;
      case 'name':
        return `.byName("${selector.value}")`;
      case 'index':
        // JXA uses 0-based indexing, use .at() method
        return `.at(${String(selector.value)})`;
      case 'whose':
        return `.whose(${this.formatWhosePredicate(selector.predicate)})`;
    }
  }

  private formatWhosePredicate(predicate: Record<string, unknown>): string {
    const conditions = Object.entries(predicate)
      .map(([key, value]) => `_${key}: { _equals: ${JSON.stringify(value)} }`)
      .join(', ');
    return `{ ${conditions} }`;
  }

  private formatProperties(props: Record<string, unknown>): string {
    const entries = Object.entries(props)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
    return `{ ${entries} }`;
  }

  private endsWithCollection(): boolean {
    const lastStep = this.steps[this.steps.length - 1];
    return lastStep?.kind === 'collection' && !lastStep.selector;
  }
}
