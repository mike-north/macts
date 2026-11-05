/**
 * Source assertions about retained positional inputs ignore the independent
 * trailing cancellation argument. Executable facade tests cover that argument.
 */
export function positionalOperationSource(source: string): string {
  return source
    .replace(/,? ?__mactsOptions\?: import\('@macts\/contracts'\)\.CallOptions/g, '')
    .replace(/, __mactsOptions\);/g, ');')
}
