import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import type BreakoutExercise from './BreakoutExercise'
import { guardValidHex } from '../house/helpers'

export type CircleInstance = Jiki.Instance & {}

function fn(exercise: BreakoutExercise) {

  const drawCircle = (
    executionCtx: ExecutionContext,
    circle: Jiki.Instance
  ) => {
    const div = document.createElement('div')
    div.classList.add('circle')
    div.id = `circle-${circle.objectId}`
    div.style.left = `${circle.getUnwrappedField('cx') as number}%`
    div.style.top = `${circle.getUnwrappedField('cy') as number}%`
    div.style.width = `${(circle.getUnwrappedField('radius') as number) * 2}%`
    div.style.height = `${(circle.getUnwrappedField('radius') as number) * 2}%`
    div.style.backgroundColor = circle.getUnwrappedField('fill_color_hex') as string
    div.style.opacity = '0'
    exercise.getContainer().appendChild(div)
    exercise.animateIntoView(
      executionCtx,
      `#${exercise.getView().id} #circle-${circle.objectId}`
    )

    exercise.circles.push(circle as CircleInstance)
  }
  const move = (executionCtx: ExecutionContext, circle: Jiki.Instance) => {
    exercise.addAnimation({
      targets: `#${exercise.getView().id} #circle-${circle.objectId}`,
      duration: 1,
      transformations: {
        left: `${circle.getUnwrappedField('cx') as number}%`,
        top: `${circle.getUnwrappedField('cy') as number}%`,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(1)

    exercise.circlePositions.push([
      circle.getUnwrappedField('cx') as number,
      circle.getUnwrappedField('cy') as number,
    ])
  }

  const Circle = new Jiki.Class('Circle')
  Circle.addConstructor(function (
    executionCtx: ExecutionContext,
    object: Jiki.Instance,
    cx: Jiki.JikiObject,
    cy: Jiki.JikiObject,
    radius: Jiki.JikiObject,
    fillColorHex: Jiki.JikiObject
  ) {
    if (!(cx instanceof Jiki.Number)) {
      return executionCtx.logicError('Ooops! Cx must be a number.')
    }
    if (!(cy instanceof Jiki.Number)) {
      return executionCtx.logicError('Ooops! Cy must be a number.')
    }
    if (!(radius instanceof Jiki.Number)) {
      return executionCtx.logicError('Ooops! Radius must be a number.')
    }
    guardValidHex(executionCtx, fillColorHex)

    object.setField('cx', cx)
    object.setField('cy', cy)
    object.setField('radius', radius)
    object.setField('fill_color_hex', fillColorHex)
    drawCircle(executionCtx, object)
  })
  Circle.addGetter('cx', 'public')
  Circle.addGetter('cy', 'public')
  Circle.addGetter('radius', 'public')

  Circle.addSetter(
    'cx',
    'public',
    function (
      executionCtx: ExecutionContext,
      object: Jiki.Instance,
      cx: Jiki.JikiObject
    ) {
      if (!(cx instanceof Jiki.Number)) {
        return executionCtx.logicError('Ooops! Cx must be a number.')
      }
      object.setField('cx', cx)

      move(executionCtx, object)
    }
  )
  Circle.addSetter(
    'cy',
    'public',
    function (
      executionCtx: ExecutionContext,
      object: Jiki.Instance,
      cy: Jiki.JikiObject
    ) {
      if (!(cy instanceof Jiki.Number)) {
        return executionCtx.logicError('Ooops! Cy must be a number.')
      }
      object.setField('cy', cy)

      move(executionCtx, object)
    }
  )
  return Circle
}

export function buildCircle(exercise: BreakoutExercise) {
  return fn(exercise)
}
