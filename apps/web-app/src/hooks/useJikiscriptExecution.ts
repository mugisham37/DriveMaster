import { useState, useCallback, useRef } from 'react'

export interface JikiscriptExecutionOptions {
  canvasContext?: CanvasRenderingContext2D
  enableDrawingFunctions?: boolean
  enableMathFunctions?: boolean
  customFunctions?: Array<{
    name: string
    arity: number[]
    code: string
  }>
}

export interface ExecutionResult {
  frames?: Array<{
    location?: { line: number }
    status: string
    result?: any
    error?: Error
  }>
  output?: any
  error?: Error
}

export interface TestResult {
  name: string
  passed: boolean
  message?: string
  error?: Error
}

export function useJikiscriptExecution(options: JikiscriptExecutionOptions = {}) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [lastError, setLastError] = useState<Error | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const executeJikiscript = useCallback(async (code: string): Promise<ExecutionResult> => {
    setIsExecuting(true)
    setLastError(null)
    
    try {
      // Mock Jikiscript execution for now
      // In a real implementation, this would use the actual Jikiscript interpreter
      const result: ExecutionResult = {
        frames: [
          {
            location: { line: 1 },
            status: 'success',
            result: 'Mock execution result'
          }
        ],
        output: 'Mock output'
      }
      
      setExecutionResult(result)
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setLastError(err)
      throw err
    } finally {
      setIsExecuting(false)
    }
  }, [])

  const runTests = useCallback(async (code: string, tests: Array<{
    name: string
    code: string
    setup?: string
    expectedMessage?: string
  }>): Promise<TestResult[]> => {
    setIsExecuting(true)
    
    try {
      // Mock test execution
      const results: TestResult[] = tests.map(test => ({
        name: test.name,
        passed: Math.random() > 0.5, // Random pass/fail for mock
        message: `Test ${test.name} executed`
      }))
      
      setTestResults(results)
      return results
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setLastError(err)
      throw err
    } finally {
      setIsExecuting(false)
    }
  }, [])

  const clearCanvas = useCallback(() => {
    if (options.canvasContext) {
      const canvas = options.canvasContext.canvas
      options.canvasContext.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [options.canvasContext])

  const clearResults = useCallback(() => {
    setExecutionResult(null)
    setTestResults([])
    setLastError(null)
  }, [])

  return {
    executeJikiscript,
    runTests,
    isExecuting,
    executionResult,
    testResults,
    lastError,
    clearCanvas,
    clearResults
  }
}