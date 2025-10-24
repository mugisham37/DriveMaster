// Mock types for interpreter components
interface Expression {
  type: string
}

interface FunctionCallExpression extends Expression {
  type: 'FunctionCall'
  name: string
  args: Expression[]
  callee?: {
    name?: {
      lexeme: string
    }
  }
}

interface Statement {
  type: string
}

interface InterpretResult {
  meta: {
    functionCallLog: Record<string, unknown[][]>
    statements: Statement[]
    sourceCode: string
  }
  output?: unknown
}

function numFunctionCalls(
  result: InterpretResult,
  name: string,
  args: unknown[] | null
): number {
  const fnCalls = result.meta.functionCallLog

  if (fnCalls[name] === undefined) {
    return 0
  }

  if (args !== null && args !== undefined) {
    const key = JSON.stringify(args)
    const callsForName = fnCalls[name] as unknown[][]
    return callsForName?.filter(call => JSON.stringify(call) === key).length || 0
  }

  const callsForName = fnCalls[name] as unknown[][]
  return callsForName?.length || 0
}

function wasFunctionCalled(
  result: InterpretResult,
  name: string,
  args: unknown[] | null
): boolean {
  return numFunctionCalls(result, name, args) >= 1
}

function numLinesOfCode(
  result: InterpretResult,
  numStubLines: number = 0
): number {
  const lines = result.meta.sourceCode
    .split('\n')
    .filter((l: string) => l.trim() !== '' && !l.startsWith('//'))

  return lines.length - numStubLines
}

// Mock function to extract function call expressions - moved to bottom to avoid duplicate

function numFunctionCallsInCode(
  result: InterpretResult,
  fnName: string
): number {
  return extractFunctionCallExpressions(result.meta.statements).filter(
    (expr) => {
      return expr.callee?.name?.lexeme === fnName
    }
  ).length
}

function numStatements(result: InterpretResult): number {
  return result.meta.statements.length
}

function numTimesStatementUsed(result: InterpretResult, type: string): number {
  const filterStatements = (statements: Statement[]): Statement[] =>
    statements
      .filter((obj: Statement | null) => obj)
      .map((elem: Statement) => {
        if (elem.type === type) {
          return [elem]
        }
        // Mock implementation - in real code this would traverse children
        return []
      })
      .flat()

  return filterStatements(result.meta.statements).length
}

function numDirectStringComparisons(_result: InterpretResult): number {
  // Mock implementation - in real code this would parse binary expressions
  return 0
}

function numUppercaseLettersInStrings(_result: InterpretResult): number {
  // Mock implementation - in real code this would parse literal expressions
  return 0
}

const checkers = {
  numFunctionCalls,
  wasFunctionCalled,
  numFunctionCallsInCode,
  numStatements,
  numDirectStringComparisons,
  numTimesStatementUsed,
  numUppercaseLettersInStrings,
  numLinesOfCode,
}

export default checkers

export function extractFunctionCallExpressions(
  _tree: Statement[]
): FunctionCallExpression[] {
  // Mock implementation - in real code this would parse the AST
  return []
}

export function extractExpressions<T extends Expression>(
  tree: Statement[],
  type: new (...args: unknown[]) => T
): T[] {
  // Remove null and undefined then map to the subtrees and
  // eventually to the call expressions.
  return tree
    .filter((obj) => obj)
    .map((elem: Statement) => {
      const res = elem instanceof type ? [elem as T] : []
      // Mock implementation - in real code this would traverse children
      return res
    })
    .flat()
}
