import { expect } from '../expect'
import type { Exercise } from '../../exercises/Exercise'
import type { InterpretResult, TaskTest, ExpectCheck, ExpectCheckFunction, ExpectCheckProperty } from '../../../types/JikiscriptTypes'
import checkers from './checkers'

export function generateExpects(
  interpreterResult: InterpretResult,
  testData: TaskTest,
  actual: unknown,
  exercise?: Exercise
) {
  // We only need to do this once, so do it outside the loop.
  const state = exercise ? exercise.getState() : {}

  if (testData.checks === undefined) {
    throw 'No checks on this test!'
  }
  return testData.checks.map((check: ExpectCheck) => {
    const matcher = check.matcher || 'toEqual'

    // Check can either be a reference to the final state or a function call.
    // We pivot on that to determine the actual value
    let checkActual
    let codeRun

    // If it's a function call, we split out any params and then call the function
    // on the exercise with those params passed in.
    if ('function' in check) {
      const functionCheck = check as ExpectCheckFunction

      let fnName
      let args
      if (functionCheck.function.includes('(') && functionCheck.function.endsWith(')')) {
        fnName = functionCheck.function.slice(0, functionCheck.function.indexOf('('))
        const argsString = functionCheck.function.slice(
          functionCheck.function.indexOf('(') + 1,
          -1
        )

        // We eval the args to turn numbers into numbers, strings into strings, etc.
        const safe_eval = eval // https://esbuild.github.io/content-types/#direct-eval
        args = safe_eval(`[${argsString}]`)
      } else {
        fnName = functionCheck.function
        args = functionCheck.args || []
      }

      // And then we get the function from either exercise or checkers and call it.
      const fn = exercise ? 
        (typeof (exercise as Record<string, unknown>)[fnName] === 'function' ? 
          ((exercise as Record<string, unknown>)[fnName] as (...args: unknown[]) => unknown).bind(exercise) : 
          undefined) : 
        (checkers as Record<string, unknown>)[fnName] as ((...args: unknown[]) => unknown) | undefined

      checkActual = fn?.call(exercise, interpreterResult, ...args)
      codeRun = functionCheck.codeRun ? functionCheck.codeRun : undefined
    }

    // Our normal state is much easier! We just check the state object that
    // we've retrieved above via getState() for the variable in question.
    else if ('property' in check) {
      const propertyCheck = check as ExpectCheckProperty
      checkActual = (state as Record<string, unknown>)[propertyCheck.property]
      codeRun = propertyCheck.codeRun ? propertyCheck.codeRun : undefined
    }

    // And the return state is easiest of all!
    else {
      checkActual = actual
    }

    const errorHtml = check.errorHtml?.replaceAll('%actual%', checkActual) || ''
    if (check.value == undefined) {
      check.value = "THIS SHOULDN'T BE UNDEFINED"
    }

    return expect({
      ...check,
      actual: checkActual,
      codeRun: codeRun ?? '',
      errorHtml: errorHtml ?? '',
      matcher, // Useful for logging and the actual tests
    })[matcher as AvailableMatchers](check.value)
  })
}
