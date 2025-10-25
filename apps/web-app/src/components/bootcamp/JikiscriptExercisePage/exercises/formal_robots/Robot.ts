import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import FormalRobotsExercise from './FormalRobotsExercise'

export type RobotInstance = Jiki.Instance & {}

function fn(this: FormalRobotsExercise) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const exercise = this
  const Robot = new Jiki.JikiClass('Robot', {})
  Robot.addConstructor(function (
    _executionCtx: ExecutionContext,
    object: Jiki.Instance
  ) {
    const name = exercise.robotNames.shift() || ''
    const age = exercise.robotAges.shift() || 0
    object.setField('name', new Jiki.JikiString(name))
    object.setField('age', new Jiki.JikiNumber(age))
  })
  Robot.addGetter('age', 'public')
  Robot.addMethod(
    'say',
    'caused the robot to say ${arg1}',
    'public',
    function (
      executionCtx: ExecutionContext,
      object: RobotInstance,
      utterence: Jiki.JikiObject
    ) {
      if (!(utterence instanceof Jiki.JikiString)) {
        return executionCtx.logicError('What the robot says must be a string')
      }
      exercise.interactions.push(
        `${object.getUnwrappedField('name')}: ${utterence.value}`
      )
    }
  )
  return Robot
}

export function buildRobot(binder: FormalRobotsExercise) {
  return fn.bind(binder)()
}
