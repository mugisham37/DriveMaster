import type { ExecutionContext, ExternalFunction } from '@/lib/interpreter/executor'
import { Exercise } from '../Exercise'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import { buildRobot } from './Robot'
import { buildFormalConversation } from './FormalConversation'

export default class FormalRobotsExercise extends Exercise {
  private Robot = buildRobot(this)
  private FormalConversation = buildFormalConversation(this)

  public static override hasView = false
  public interactions: string[] = []
  public robotNames: string[] = []
  public robotAges: number[] = []

  public constructor() {
    super()
  }

  public setRobotNames(_: unknown, robotNames: string[]) {
    this.robotNames = [...robotNames]
  }

  public setRobotAges(_: unknown, robotAges: number[]) {
    this.robotAges = [...robotAges]
  }

  public override getState() {
    return {}
  }
  public getInteraction(_: unknown, idx: number) {
    return this.interactions[idx]
  }
  public vibrate_air(
    executionCtx: ExecutionContext,
    name: Jiki.JikiObject,
    utterance: Jiki.JikiObject
  ) {
    if (!(name instanceof Jiki.String)) {
      return executionCtx.logicError('The robot name must be a string')
    }
    if (!(utterance instanceof Jiki.String)) {
      return executionCtx.logicError('What the robot says must be a string')
    }
    this.interactions.push(`${name.value}: ${utterance.value}`)
  }

  public availableClasses: Jiki.JikiClass[] = [this.Robot, this.FormalConversation]
  public override availableFunctions: ExternalFunction[] = [
    {
      name: 'vibrate_air',
      func: (...args: unknown[]) => this.vibrate_air(args[0] as ExecutionContext, args[1] as Jiki.JikiObject, args[2] as Jiki.JikiObject),
      description: 'caused the robot to speak',
    },
  ]
}
