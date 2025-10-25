import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import type BreakoutExercise from './BreakoutExercise'
import { BlockInstance } from './Block'
import { buildBall, type BallInstance } from './Ball'
import { buildPaddle, type PaddleInstance } from './Paddle'

export type GameInstance = Jiki.Instance & {
  ball: BallInstance
  paddle: PaddleInstance
}

function fn(exercise: BreakoutExercise) {
  const Ball = buildBall(exercise)
  const Paddle = buildPaddle(exercise)

  const Game = new Jiki.Class('Game')
  Game.addConstructor(function (
    executionCtx: ExecutionContext,
    game: Jiki.Instance
  ) {
    const ball = Ball.instantiate(executionCtx, []) as Jiki.Instance
    ball.setField('cy', new Jiki.Number(95 - exercise.default_ball_radius))
    exercise.redrawBall(executionCtx, ball as BallInstance)
    exercise.gameInstance = game as GameInstance

    game.setField('ball', ball as unknown as Jiki.JikiscriptValue)
    game.setField('paddle', Paddle.instantiate(executionCtx, []) as unknown as Jiki.JikiscriptValue)
    game.setField('blocks', new Jiki.List([]))
  })

  Game.addGetter('ball', 'public')
  Game.addSetter('ball', 'public', function() {})
  Game.addGetter('paddle', 'public')
  Game.addSetter('paddle', 'public', function() {})
  Game.addGetter('blocks', 'public')

  Game.addMethod(
    'add_block',
    'added a block to the game',
    'public',
    function (
      executionCtx: ExecutionContext,
      game: Jiki.Instance,
      block: Jiki.JikiObject
    ) {
      if (!Jiki.isInstance(block)) {
        return executionCtx.logicError('block must be a Block')
      }
      ;(game.getField('blocks') as Jiki.JikiList).value.push(block)
      exercise.drawBlock(executionCtx, block as unknown as BlockInstance)
    }
  )

  Game.addMethod(
    'game_over',
    'set the game as over',
    'public',
    function (
      executionCtx: ExecutionContext,
      _game: Jiki.Instance
    ) {
      exercise.gameOver(executionCtx)
    }
  )

  return Game
}

export function buildGame(exercise: BreakoutExercise) {
  return fn(exercise)
}
