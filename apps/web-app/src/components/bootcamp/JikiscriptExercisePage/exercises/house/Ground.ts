import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import { changeBrightness, storeShape } from './Component'
import HouseExercise from './HouseExercise'

function fn(this: HouseExercise) {
  const drawGround = (
    executionCtx: ExecutionContext,
    ground: Jiki.Instance
  ) => {
    this.fillColorHex(executionCtx, new Jiki.JikiString('#3cb372'))
    this.rectangle(
      executionCtx,
      new Jiki.JikiNumber(0),
      new Jiki.JikiNumber(100 - (ground.getField('height') as Jiki.JikiNumber).value),
      new Jiki.JikiNumber(100),
      ground.getField('height') as Jiki.JikiNumber
    )
    storeShape(this, ground)
  }

  const changeGroundBrightness = (
    executionCtx: ExecutionContext,
    ground: Jiki.Instance
  ) => {
    changeBrightness(executionCtx, this, ground)
    this.events.push(
      `ground:brightness:${ground.getUnwrappedField('brightness')}`
    )
  }

  const Ground = new Jiki.JikiClass('Ground', {})
  Ground.addConstructor(function (
    executionCtx: ExecutionContext,
    object: Jiki.Instance,
    height: Jiki.JikiObject,
    z_index: Jiki.JikiObject
  ) {
    if (!(height instanceof Jiki.Number) || !(z_index instanceof Jiki.Number)) {
      executionCtx.logicError(
        'Ground constructor requires height and z_index to be numbers'
      )
    }
    object.setField('height', height)
    object.setField('z_index', z_index)
    drawGround(executionCtx, object)
  })
  Ground.addGetter('height', 'public')
  Ground.addSetter(
    'brightness',
    'public',
    function (
      executionCtx: ExecutionContext,
      object: Jiki.Instance,
      brightness: Jiki.JikiObject
    ) {
      if (!(brightness instanceof Jiki.Number)) {
        return executionCtx.logicError('Ooops! Brightness must be a number.')
      }
      if (brightness.value < 0 || brightness.value > 100) {
        executionCtx.logicError('Brightness must be between 0 and 100')
      }
      object.setField('brightness', brightness)
      changeGroundBrightness(executionCtx, object)
    }
  )

  return Ground
}

export function buildGround(binder: HouseExercise) {
  return fn.bind(binder)()
}
