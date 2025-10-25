import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import type BreakoutExercise from './BreakoutExercise'

export type PaddleInstance = Jiki.Instance & {}

function fn(exercise: BreakoutExercise) {

  const createPaddle = (
    executionCtx: ExecutionContext,
    paddle: PaddleInstance
  ) => {
    const div = document.createElement('div')
    div.classList.add('paddle')
    div.id = `paddle-${paddle.objectId}`
    div.style.left = `${paddle.getUnwrappedField('cx') as number}%`
    div.style.top = `${paddle.getUnwrappedField('cy') as number}%`
    div.style.width = `${paddle.getUnwrappedField('width') as number}%`
    div.style.height = `${paddle.getUnwrappedField('height') as number}%`
    div.style.opacity = '0'
    exercise.getContainer().appendChild(div)
    exercise.animateIntoView(
      executionCtx,
      `#${exercise.getView().id} #paddle-${paddle.objectId}`
    )
  }
  const move = (executionCtx: ExecutionContext, paddle: PaddleInstance) => {
    exercise.addAnimation({
      targets: `#${exercise.getView().id} #paddle-${paddle.objectId}`,
      duration: 1,
      transformations: {
        left: `${paddle.getUnwrappedField('cx') as number}%`,
        top: `${paddle.getUnwrappedField('cy') as number}%`,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(1)
  }

  const Paddle = new Jiki.Class('Paddle')
  const defaultWidth = 20
  const defaultHeight = 4
  const defaultCy = 97
  
  Paddle.addConstructor(function (
    executionCtx: ExecutionContext,
    paddle: Jiki.Instance
  ) {
    paddle.setField('cx', new Jiki.Number(50))
    paddle.setField('cy', new Jiki.Number(defaultCy))
    paddle.setField('width', new Jiki.Number(defaultWidth))
    paddle.setField('height', new Jiki.Number(defaultHeight))
    createPaddle(executionCtx, paddle)
  })
  Paddle.addGetter('cx', 'public')
  Paddle.addGetter('cy', 'public')
  Paddle.addGetter('height', 'public')
  Paddle.addGetter('width', 'public')

  Paddle.addMethod(
    'move_left',
    'moved the paddle left 0.85 units',
    'public',
    function (executionCtx: ExecutionContext, paddle: PaddleInstance) {
      const newCx = (paddle.getUnwrappedField('cx') as number) - 0.85
      if (newCx - (paddle.getUnwrappedField('width') as number) / 2 < 0) {
        return executionCtx.logicError(
          'Paddle cannot move off the left of the screen'
        )
      }
      if (newCx + (paddle.getUnwrappedField('width') as number) / 2 > 100) {
        return executionCtx.logicError(
          'Paddle cannot move off the right of the screen'
        )
      }
      if (exercise.lastMovedItem == 'paddle') {
        return executionCtx.logicError(
          'You cannot move the Paddle twice in a row.'
        )
      }

      paddle.setField('cx', new Jiki.Number(newCx))
      exercise.lastMovedItem = 'paddle'
      move(executionCtx, paddle)
    }
  )

  Paddle.addMethod(
    'move_right',
    'moved the paddle right 0.9 units',
    'public',
    function (executionCtx: ExecutionContext, paddle: PaddleInstance) {
      const newCx = (paddle.getUnwrappedField('cx') as number) + 0.9
      if (newCx - (paddle.getUnwrappedField('width') as number) / 2 < 0) {
        return executionCtx.logicError(
          'Paddle cannot move off the left of the screen'
        )
      }
      if (newCx + (paddle.getUnwrappedField('width') as number) / 2 > 100) {
        return executionCtx.logicError(
          'Paddle cannot move off the right of the screen'
        )
      }

      paddle.setField('cx', new Jiki.Number(newCx))
      move(executionCtx, paddle)
    }
  )

  return Paddle
}

export function buildPaddle(exercise: BreakoutExercise) {
  return fn(exercise)
}
