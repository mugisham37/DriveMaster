import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import MazeExercise from './MazeExercise'

export type SquareInstance = Jiki.Instance & {
  start: Jiki.JikiBoolean
  finish: Jiki.JikiBoolean
  wall: Jiki.JikiBoolean
  in_maze: Jiki.JikiBoolean
  contents: Jiki.JikiString
}

function fn(this: MazeExercise) {
  const removeEmoji = (
    executionCtx: ExecutionContext,
    square: SquareInstance
  ) => {
    if (square.getUnwrappedField('contents') === '') {
      executionCtx.logicError(
        'You tried to remove an emoji from a square that does not have one.'
      )
    }

    square.setField('contents', { type: 'String', value: '' } as Jiki.JikiObject)

    const emojiSelector = `#${this.view.id} .cell-${square.getUnwrappedField(
      'row'
    )}-${square.getUnwrappedField('col')} .emoji`
    this.addAnimation({
      targets: emojiSelector,
      duration: 1,
      transformations: {
        opacity: 0,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(1)
  }

  const Square = new Jiki.Class('Square')
  Square.addConstructor(function (
    executionContext: ExecutionContext,
    object: Jiki.Instance,
    row: Jiki.JikiObject,
    col: Jiki.JikiObject,
    in_maze: Jiki.JikiObject,
    is_start: Jiki.JikiObject,
    is_finish: Jiki.JikiObject,
    is_wall: Jiki.JikiObject,
    contents: Jiki.JikiObject
  ) {
    if (!(row instanceof Jiki.JikiNumber))
      executionContext.logicError('row must be a Jiki.Number')
    if (!(col instanceof Jiki.JikiNumber))
      executionContext.logicError('col must be a Jiki.Number')
    if (!(in_maze instanceof Jiki.JikiBoolean))
      executionContext.logicError('in_maze must be a Jiki.Boolean')
    if (!(is_start instanceof Jiki.JikiBoolean))
      executionContext.logicError('is_start must be a Jiki.Boolean')
    if (!(is_finish instanceof Jiki.JikiBoolean))
      executionContext.logicError('is_finish must be a Jiki.Boolean')
    if (!(is_wall instanceof Jiki.JikiBoolean))
      executionContext.logicError('is_wall must be a Jiki.Boolean')
    if (!(contents instanceof Jiki.JikiString))
      executionContext.logicError('contents must be a Jiki.String')

    object.setField('row', row as unknown as Jiki.JikiObject)
    object.setField('col', col as unknown as Jiki.JikiObject)
    object.setField('is_start', is_start as unknown as Jiki.JikiObject)
    object.setField('is_finish', is_finish as unknown as Jiki.JikiObject)
    object.setField('is_wall', is_wall as unknown as Jiki.JikiObject)
    object.setField('in_maze', in_maze as unknown as Jiki.JikiObject)
    object.setField('contents', contents as unknown as Jiki.JikiObject)
  })
  Square.addGetter('is_start', 'public', function(_executionCtx: ExecutionContext, object: Jiki.Instance) {
    return object.getField('is_start');
  })
  Square.addGetter('is_finish', 'public', function(_executionCtx: ExecutionContext, object: Jiki.Instance) {
    return object.getField('is_finish');
  })
  Square.addGetter('is_wall', 'public', function(_executionCtx: ExecutionContext, object: Jiki.Instance) {
    return object.getField('is_wall');
  })
  Square.addGetter('in_maze', 'public', function(_executionCtx: ExecutionContext, object: Jiki.Instance) {
    return object.getField('in_maze');
  })
  Square.addGetter('contents', 'public', function(_executionCtx: ExecutionContext, object: Jiki.Instance) {
    return object.getField('contents');
  })
  Square.addMethod(
    'remove_emoji',
    'removed the emoji from the square',
    'public',
    function (executionCtx: ExecutionContext, object: Jiki.Instance) {
      removeEmoji(executionCtx, object as SquareInstance)
    }
  )

  return Square
}

export function buildSquare(binder: MazeExercise) {
  return fn.bind(binder)()
}
