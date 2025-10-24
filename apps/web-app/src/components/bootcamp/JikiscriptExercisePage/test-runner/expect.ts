// Simple array check function
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

// Simple deep equality check
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => isEqual(item, b[index]))
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>)
    const keysB = Object.keys(b as Record<string, unknown>)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  }
  
  return false
}

export function expect({
  actual,
  errorHtml,
  codeRun,
  matcher,
}: {
  actual: unknown
  slug?: string
  errorHtml?: string
  codeRun?: string
  matcher: AvailableMatchers
}): Record<AvailableMatchers, (expected?: unknown) => MatcherResult> {
  const returnObject: Omit<MatcherResult, 'pass' | 'expected'> = {
    actual,
    errorHtml: errorHtml ?? '',
    codeRun: codeRun ?? '',
    matcher,
  }
  return {
    toBeDefined() {
      return {
        ...returnObject,
        pass: actual !== undefined && actual !== null,
      }
    },
    toBeUndefined() {
      return {
        ...returnObject,
        pass: actual === undefined || actual === null,
      }
    },
    toBe(expected: unknown) {
      return {
        ...returnObject,
        expected,
        pass: actual === expected,
      }
    },
    toBeTrue() {
      return {
        ...returnObject,
        expected: true,
        pass: actual === true,
      }
    },
    toBeFalse() {
      return {
        ...returnObject,
        expected: false,
        pass: actual === false,
      }
    },
    toEqual(expected: unknown) {
      return {
        ...returnObject,
        expected,
        pass: isEqual(expected, actual),
      }
    },
    toBeGreaterThanOrEqual(expected: unknown) {
      const expectedNum = expected as number
      return {
        ...returnObject,
        expected: expectedNum,
        pass: typeof actual === 'number' && actual >= expectedNum,
      }
    },
    toBeLessThanOrEqual(expected: unknown) {
      const expectedNum = expected as number
      return {
        ...returnObject,
        expected: expectedNum,
        pass: typeof actual === 'number' && (actual as number) <= expectedNum,
      }
    },

    toIncludeSameMembers(expected: unknown) {
      const expectedArray = expected as unknown[]
      let pass
      if (expectedArray == null || actual == null) {
        pass = false
      } else if (!isArray(expectedArray) || !isArray(actual)) {
        pass = false
      } else {
        pass = isEqual([...expectedArray].sort(), [...(actual as unknown[])].sort())
      }
      return {
        ...returnObject,
        expected: expectedArray,
        pass,
      }
    },
  }
}
