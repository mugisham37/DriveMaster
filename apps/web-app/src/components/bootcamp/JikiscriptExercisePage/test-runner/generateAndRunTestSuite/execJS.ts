import { generateCodeRunString } from '../../utils/generateCodeRunString'
import * as acorn from 'acorn'

const esm = (code: string) =>
  URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))

type ExecSuccess = {
  status: 'success'
  result: unknown
  cleanup: () => void
}
type ExecError = {
  status: 'error'
  error: {
    type: string
    message: string
    lineNumber: number
    colNumber: number
  }
  cleanup: () => void
}
type ExecResult = ExecSuccess | ExecError

export async function execJS(
  studentCode: string,
  fnName: string,
  args: unknown[],
  externalFunctionNames: string[]
): Promise<ExecResult> {
  // First, look for parse-errors, which we have to do via acorn to get line/col numbers.
  try {
    acorn.parse(studentCode, { ecmaVersion: 2020, sourceType: 'module' })
  } catch (err: unknown) {
    const errorObj = err as { message?: string; loc?: { line: number; column: number }; name?: string }
    return {
      status: 'error',
      cleanup: () => { },
      error: {
        message: errorObj.message?.replace(/\s*\(\d+:\d+\)$/, '') || 'Unknown error',
        lineNumber: errorObj.loc?.line ? errorObj.loc.line - 1 : 0,
        colNumber: errorObj.loc?.column || 0,
        type: errorObj.name || 'Error',
      },
    }
  }

  let code = `
    let currentTime = 0
    const executionCtx = { 
      getCurrentTime: () => currentTime, 
      fastForward: (time) => { currentTime += time },
      updateState: () => {},
      logicError: (e) => { globalThis.logicError(e) },
    }
  `
  code += `export function log(...args) { globalThis.customLog.call(null,...args) }\n`
  externalFunctionNames.forEach((fn) => {
    code += `export function ${fn}(...args) { return globalThis.externalFunctions.${fn}.call(null, executionCtx, ...args) }\n`
  })
  const numSetupLines = code.split('\n').length
  code += studentCode

  const importableStudentCode = esm(code)
  const importableTestCode = esm(`
    import { ${fnName} } from '${importableStudentCode}'
    export default ${generateCodeRunString(fnName, args)}
  `)

  function cleanup() {
    URL.revokeObjectURL(importableStudentCode)
    URL.revokeObjectURL(importableTestCode)
  }

  try {
    const result = await import(`${importableTestCode}`)
    const successResult: ExecSuccess = {
      status: 'success',
      result: result.default,
      cleanup,
    }
    return successResult
  } catch (error: unknown) {
    let lineNumber: string
    let colNumber: string

    const errorObj = error as { name?: string; stack?: string; message?: string }
    if (errorObj.name === 'JikiLogicError') {
      ;[, lineNumber, colNumber] = extractLineColFromJikiLogicError(errorObj)
    } else {
      // Extract line, and column from the error message string
      ;[, lineNumber, colNumber] =
        errorObj.stack?.match(/:(\d+):(\d+)\)?\s*$/m) || ['', '0', '0']
    }
    let errorMessage = errorObj.message || 'Unknown error'
    if (errorMessage.includes('does not provide an export')) {
      errorMessage = `Oh dear, we couldn't find \`${fnName}\`. Did you forget to \`export\` it?`
    }

    const execError: ExecError = {
      status: 'error',
      error: {
        type: errorObj.name || 'Error',
        message: errorMessage,
        lineNumber: lineNumber ? parseInt(lineNumber) - numSetupLines : 0,
        colNumber: colNumber ? parseInt(colNumber) : 0,
      },
      cleanup,
    }
    return execError
  }
}

function extractLineColFromJikiLogicError(error: { stack?: string }): string[] {
  const stack = error.stack || ''

  const lines = stack.split('\n')
  const index = lines.findIndex((line) =>
    line.includes('JikiscriptExercisePage')
  )
  const targetLine = lines[index + 2]

  if (!targetLine) return ['', '', '']

  const match = targetLine.match(/:(\d+):(\d+)\)?\s*$/)
  if (!match) return ['', '', '']

  return match
}
