import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import { storeShape, changeBrightness } from './Component'
import HouseExercise from './HouseExercise'

function fn(this: HouseExercise) {
  const drawRoof = (executionCtx: ExecutionContext, roof: Jiki.Instance) => {
    this.fillColorHex(executionCtx, new Jiki.String('#8b4513'))
    this.triangle(
      executionCtx,
      roof.getField('left') as Jiki.JikiObject,
      roof.getField('bottom') as Jiki.JikiObject,
      roof.getField('center') as Jiki.JikiObject,
      roof.getField('top') as Jiki.JikiObject,
      roof.getField('right') as Jiki.JikiObject,
      roof.getField('bottom') as Jiki.JikiObject
    )
    storeShape(this, roof)
  }

  const changeRoofBrightness = (
    executionCtx: ExecutionContext,
    roof: Jiki.Instance
  ) => {
    changeBrightness(executionCtx, this, roof)
    this.events.push(`roof:brightness:${roof.getUnwrappedField('brightness')}`)
  }
  const Roof = new Jiki.Class('Roof')
  Roof.addConstructor(function (
    executionCtx: ExecutionContext,
    object: Jiki.Instance,
    center: Jiki.JikiObject,
    top: Jiki.JikiObject,
    width: Jiki.JikiObject,
    height: Jiki.JikiObject,
    z_index: Jiki.JikiObject
  ) {
    if (
      !(center instanceof Jiki.Number) ||
      !(top instanceof Jiki.Number) ||
      !(width instanceof Jiki.Number) ||
      !(height instanceof Jiki.Number) ||
      !(z_index instanceof Jiki.Number)
    ) {
      return executionCtx.logicError('All parameters must be numbers.')
    }

    object.setField('center', center)
    object.setField('top', top)
    object.setField('height', height)
    object.setField('width', width)
    object.setField('left', new Jiki.Number(center.value - width.value / 2))
    object.setField('right', new Jiki.Number(center.value + width.value / 2))
    object.setField('bottom', new Jiki.Number(top.value + height.value))
    object.setField('z_index', z_index)
    drawRoof(executionCtx, object)
  })
  Roof.addSetter(
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
      changeRoofBrightness(executionCtx, object)
    }
  )

  return Roof
}

export function buildRoof(binder: HouseExercise): Jiki.JikiClass {
  return fn.bind(binder)()
}
