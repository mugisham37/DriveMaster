// Mock interpreter functions
function evaluateExpression(code: string, context: unknown, expr: string): unknown {
  // Mock implementation - in real code this would evaluate the expression
  // Using parameters to avoid unused warnings
  void code; void context; void expr;
  return null
}

function evaluateFunction(code: string, context: unknown, name: string, args: unknown[]): unknown {
  // Mock implementation - in real code this would evaluate the function
  // Using parameters to avoid unused warnings
  void code; void context; void name; void args;
  return null
}

function interpret(code: string, context: unknown): { frames: Frame[], output?: unknown } {
  // Mock implementation - in real code this would interpret the code
  // Using parameters to avoid unused warnings
  void code; void context;
  return { frames: [] }
}
import { generateExpects } from './generateExpects'
import { TestRunnerOptions } from '@/components/bootcamp/types/TestRunner'
// Mock stdlib functions
const filteredStdLibFunctions: Array<{ name: string; func: (...args: unknown[]) => unknown }> = []
import { generateCodeRunString } from '../../utils/generateCodeRunString'
import { parseArgs } from './parseArgs'
import { type Project } from '@/components/bootcamp/JikiscriptExercisePage/utils/exerciseMap'
import type { Exercise } from '../../exercises/Exercise'
import {
  Animation,
  AnimationTimeline,
} from '../../AnimationTimeline/AnimationTimeline'
import { Frame } from '@/lib/interpreter/frames'
import type { EnhancedFrame } from '../../../types/JikiscriptTypes'
import { execJS } from './execJS'
import { EditorView } from '@codemirror/view'
import { InformationWidgetData } from '../../CodeMirror/extensions/end-line-information/line-information'
import { showError } from '../../utils/showError'
import { cloneDeep } from 'lodash'
import type { TaskTest, TestCallback, SetupFunction, InterpretResult } from '../../../types/JikiscriptTypes'

class JikiLogicError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JikiLogicError'
  }
}

/**
 This is of type TestCallback
 */
export async function execTest(
  testData: TaskTest,
  options: TestRunnerOptions,
  editorView: EditorView | null,
  stateSetters: {
    setUnderlineRange: (range: { from: number; to: number }) => void
    setHighlightedLine: (line: number) => void
    setHighlightedLineColor: (color: string) => void
    setShouldShowInformationWidget: (shouldShow: boolean) => void
    setInformationWidgetData: (data: InformationWidgetData) => void
  },
  language: Exercise['language'],
  project?: Project
): Promise<ReturnType<TestCallback>> {
  const exercise: Exercise | undefined = project ? new project() : undefined
  runSetupFunctions(exercise, testData.setupFunctions || [])

  // Turn {name: , func: } into {name: func}
  const externalFunctions = buildExternalFunctions(options, exercise)
  ;(globalThis as Record<string, unknown>).externalFunctions = externalFunctions.reduce((acc: Record<string, unknown>, func: { name: string; func: unknown }) => {
    acc[func.name] = func.func
    return acc
  }, {} as Record<string, unknown>)

  const logMessages: unknown[] = []
  ;(globalThis as Record<string, unknown>).customLog = function (...args: unknown[]) {
    logMessages.push(cloneDeep(args))
  }
  ;(globalThis as Record<string, unknown>).logicError = function (msg: string) {
    throw new JikiLogicError(msg)
  }

  const fnName = testData.function
  const args = testData.args ? parseArgs(testData.args) : []

  let actual: unknown
  let frames: EnhancedFrame[] = []
  let evaluated: unknown = null
  let hasJSError = false

  switch (language) {
    case 'javascript': {
      const result = await execJS(
        options.studentCode,
        // we can probably assume that fnName will always exist?
        fnName!,
        args,
        externalFunctions.map((f: { name: string; func: unknown }) => f.name)
      )

      // console.log('result', result)
      // console.log('logMessages', logMessages)

      if (result.status === 'error') {
        if (editorView) {
          showError({
            error: result.error,
            ...stateSetters,
            editorView,
          })
        }
        hasJSError = true
      }

      // null falls back to [Your function didn't return anything]
      actual = result.status === 'success' ? result.result : null
      break
    }

    case 'jikiscript': {
      const context = {
        externalFunctions: buildExternalFunctions(options, exercise),
        classes: buildExternalClasses(options, exercise),
        languageFeatures: options.config.interpreterOptions,
        customFunctions: options.customFunctions,
      }

      if (fnName) {
        evaluated = evaluateFunction(
          options.studentCode,
          context,
          fnName,
          args
        )
      } else if (testData.expression) {
        evaluated = evaluateExpression(
          options.studentCode,
          context,
          testData.expression
        )
      } else {
        evaluated = interpret(options.studentCode, context)
      }

      const interpretResult = evaluated as InterpretResult
      actual = interpretResult.output
      frames = []
      break
    }
  }

  const codeRun = testData.codeRun ?? generateCodeRunString(fnName, args)

  const expects = generateExpects(evaluated as InterpretResult, testData, actual, exercise)

  if (hasJSError) {
    expects.push({
      actual: 'running',
      matcher: 'toBe',
      errorHtml: 'Your code has an error in it.',
      expected: true,
      pass: false,
    })
  }

  const result: ReturnType<TestCallback> = {
    expects,
    slug: testData.slug,
    codeRun,
    frames,
    type: options.config.testsType || (exercise ? 'state' : 'io'),
    animationTimeline: buildAnimationTimeline(exercise, frames),
    logMessages,
  }
  
  // Only add optional properties if they exist
  if (testData.imageSlug) {
    result.imageSlug = testData.imageSlug
  }
  
  const view = exercise?.getView()
  if (view) {
    result.view = view
  }
  
  return result
}

const buildExternalFunctions = (
  options: TestRunnerOptions,
  exercise: Exercise | undefined
): Array<{ name: string; func: (...args: unknown[]) => unknown }> => {
  // Mock implementation - in real code this would filter stdlib functions
  const externalFunctions = filteredStdLibFunctions
  if (!exercise) return externalFunctions

  let exerciseFunctions = exercise.availableFunctions || []
  if (options.config.exerciseFunctions != undefined) {
    const required = options.config.exerciseFunctions
    exerciseFunctions = exerciseFunctions.filter((func) =>
      required.includes(func.name)
    )
  }
  
  // Convert ExternalFunction[] to the expected format
  const convertedExerciseFunctions = exerciseFunctions.map(func => ({
    name: func.name,
    func: func.func || func.implementation || (() => null)
  }))
  
  return externalFunctions.concat(convertedExerciseFunctions)
}
const buildExternalClasses = (
  options: TestRunnerOptions,
  exercise: Exercise | undefined
): Array<{ name: string; [key: string]: unknown }> => {
  if (!exercise) return []

  const exerciseClasses = (exercise as unknown as { availableClasses?: Array<{ name: string; [key: string]: unknown }> }).availableClasses || []
  if (options.config.exerciseClasses != undefined) {
    const required = options.config.exerciseClasses
    return exerciseClasses.filter((func: { name: string; [key: string]: unknown }) =>
      required.includes(func.name)
    )
  }
  return exerciseClasses
}

const runSetupFunctions = (
  exercise: Exercise | undefined,
  setupFunctions: SetupFunction[]
) => {
  if (!exercise) return

  setupFunctions.forEach((functionData) => {
    const [functionName, args = []] = functionData
    if (typeof exercise[functionName] === 'function') {
      ;(exercise[functionName] as (...args: unknown[]) => unknown)(null, ...args)
    }
  })
}
export function buildAnimationTimeline(
  exercise: Exercise | undefined,
  frames: EnhancedFrame[]
) {
  let animations: Animation[] = []
  let placeholder = false
  const lastFrame: EnhancedFrame | undefined = frames.at(-1)

  // If we have a healthy animation
  if (exercise && exercise.animations && exercise.animations.length > 0) {
    animations = exercise.animations
  }
  // Else if we have a successful non-animation exercise, we create
  // one long animation that lasts for the duration of the frames.
  else if (lastFrame && lastFrame.status === 'success') {
    placeholder = true
    animations = [
      {
        targets: `body`,
        duration: lastFrame.timelineTime || 0,
        transformations: {},
        offset: 0,
      },
    ]
  }

  // Finally, as an extra guard, if we've got an infinite loop, then don't
  // add the millions  of animations to the timeline if we know it hurts
  // on that exercise.
  if (
    lastFrame &&
    lastFrame.status === 'error' &&
    lastFrame.error &&
    ('type' in lastFrame.error) &&
    ((lastFrame.error as { type: string }).type === 'MaxIterationsReached' ||
      (lastFrame.error as { type: string }).type === 'InfiniteRecursion') &&
    !exercise?.showAnimationsOnInfiniteLoops
  ) {
    // No-op
    animations = []
    placeholder = true
  }

  return new AnimationTimeline({}, frames).populateTimeline(
    animations,
    placeholder
  )
}
