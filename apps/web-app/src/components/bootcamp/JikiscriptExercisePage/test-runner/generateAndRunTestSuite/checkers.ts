// Mock types for interpreter components
interface Expression {
  type: string
}

interface FunctionCallExpression extends Expression {
  type: 'FunctionCall'
  name: string
  args: Expression[]
}

interface BinaryExpression extends Expression {
  type: 'Binary'
  operator: string
  left: Expression
  right: Expression
}

interface LiteralExpression extends Expression {
  type: 'Literal'
  value: unknown
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
  args: unknown[] | null,
  times?: number
): boolean {
  return numFunctionCalls(result, name, args) >= (times || 1)
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

// Mock function to extract function call expressions
function extractFunctionCallExpressions(statements: Statement[]): FunctionCallExpression[] {
  // Mock implementation - in real code this would parse the AST
  return []
}

function numFunctionCallsInCode(
  result: InterpretResult,
  fnName: string
): number {
  return extractFunctionCallExpressions(result.meta.statements).filter(
    (expr) => {
      return (expr as any).callee?.name?.lexeme === fnName
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

// Mock function to extract expressions of a specific type
function extractExpressionsInternal<T extends Expression>(
  statements: Statement[], 
  ExpressionType: new (...args: unknown[]) => T
): T[] {
  // Mock implementation - in real code this would parse the AST
  return []
}

function numDirectStringComparisons(result: InterpretResult): number {
  const binaryExpressions = extractExpressionsInternal(
    result.meta.statements,
    BinaryExpression
  )
  return binaryExpressions.filter(
    (expr) =>
      ((expr as any).operator?.type === 'EQUAL_EQUAL' &&
        expr.left.type === 'Literal' &&
        expr.right.type === 'Literal' &&
        typeof (expr.left as LiteralExpression).value === 'string') ||
      typeof (expr.right as LiteralExpression).value === 'string'
  ).length
}

function numUppercaseLettersInStrings(result: InterpretResult): number {
  const literals = extractExpressionsInternal(result.meta.statements, LiteralExpression)
  return literals.filter(
    (expr: LiteralExpression) =>
      typeof expr.value === 'string' && expr.value !== expr.value.toLowerCase()
  ).length
}

export default {
  numFunctionCalls,
  wasFunctionCalled,
  numFunctionCallsInCode,
  numStatements,
  numDirectStringComparisons,
  numTimesStatementUsed,
  numUppercaseLettersInStrings,
  numLinesOfCode,
}

export function extractFunctionCallExpressions(
  tree: Statement[]
): FunctionCallExpression[] {
  return extractExpressionsInternal(tree, FunctionCallExpression)
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
