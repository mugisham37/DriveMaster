import type { ExecutionContext } from '@/lib/interpreter/executor'
import { Exercise } from '../Exercise'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import { InterpretResult } from '@/lib/interpreter/interpreter'
import { buildBlock, type BlockInstance } from './Block'
import { buildBall, type BallInstance } from './Ball'
import { buildPaddle, type PaddleInstance } from './Paddle'
import { buildGame, type GameInstance } from './Game'
import { buildCircle, CircleInstance } from './Circle'
import { buildRectangle, RoundedRectangleInstance } from './RoundedRectangle'

export default class BreakoutExercise extends Exercise {
  private Block = buildBlock(this)
  private Ball = buildBall(this)
  private Paddle = buildPaddle(this)
  private Game = buildGame(this)
  private Circle = buildCircle(this)
  private RoundedRectangle = buildRectangle(this)

  public default_ball_radius = 3
  public default_block_height = 7
  public lastMovedItem: 'ball' | 'paddle' = 'ball'

  public autoDrawBlock = true
  public gameInstance: GameInstance | undefined
  private result: 'win' | 'lose' | undefined

  public circlePositions: [number, number][]
  public rectangleCircleInteractionCount = 0
  public circles: CircleInstance[] = []
  public roundedRectangles: RoundedRectangleInstance[] = []
  
  // Additional properties for game over views
  private gameOverWinView?: HTMLElement
  private gameOverLoseView?: HTMLElement
  public ballPositions: [number, number][] = []
  public paddleBallInteractionCount = 0
  public blocks: BlockInstance[] = []

  public constructor() {
    super('breakout')

    const container = document.createElement('div')
    container.classList.add('container')
    this.getView().appendChild(container)
    // Use protected property access through getter
    Object.defineProperty(this, 'container', { value: container, writable: false })

    this.circlePositions = []
  }
  public disableAutoDrawBlock() {
    this.autoDrawBlock = false
  }

  public getContainer(): HTMLElement {
    return this.container
  }

  public override getView(): HTMLElement {
    return super.getView()
  }

  public override getState() {
    return {
      numBlocks: this.blocks.length,
      numSmashedBlocks: this.blocks.filter((block: BlockInstance) =>
        block.getUnwrappedField('smashed') as boolean
      ).length,
      numBallPositions: this.ballPositions.length,
      paddleBallInteractionCount: this.paddleBallInteractionCount,

      numOpaqueRoundedRectangles: this.roundedRectangles.filter(
        (rectangle: RoundedRectangleInstance) =>
          (rectangle.getUnwrappedField('opacity') as number) == 1
      ).length,
      rectangleCircleInteractionCount: this.rectangleCircleInteractionCount,
      numCirclePositions: this.circlePositions.length,
      numRoundedRectangles: this.roundedRectangles.length,
    }
  }

  public setDefaultBallRadius(_: unknown, radius: number) {
    this.default_ball_radius = radius
  }

  public setDefaultBlockHeight(_: unknown, height: number) {
    this.default_block_height = height
  }

  public getFalse() {
    return false
  }

  public didBallAppearAt(_: InterpretResult, cx: number, cy: number) {
    for (const [ballX, ballY] of this.ballPositions) {
      if (
        (cx == null && ballY == cy) ||
        (cy == null && ballX == cx) ||
        (ballX == cx && ballY == cy)
      ) {
        return true
      }
    }
    return false
  }

  public didCircleAppearAt(_: InterpretResult, cx: number, cy: number) {
    for (const [circleX, circleY] of this.circlePositions) {
      if (
        (cx == null && circleY == cy) ||
        (cy == null && circleY == cx) ||
        (circleX == cx && circleY == cy)
      ) {
        return true
      }
    }
    return false
  }

  public drawBlock(executionCtx: ExecutionContext, block: BlockInstance) {
    this.blocks.push(block)

    const div = document.createElement('div')
    div.classList.add('block')
    div.id = `block-${block.objectId}`
    div.style.left = `${block.getUnwrappedField('left') as number}%`
    div.style.top = `${block.getUnwrappedField('top') as number}%`
    div.style.width = `${block.getUnwrappedField('width') as number}%`
    div.style.height = `${block.getUnwrappedField('height') as number}%`
    div.style.opacity = '0'
    this.getContainer().appendChild(div)

    this.animateIntoView(
      executionCtx,
      `#${this.getView().id} #block-${block.objectId}`
    )
  }

  public redrawBall(executionCtx: ExecutionContext, ball: BallInstance) {
    this.addAnimation({
      targets: `#${this.getView().id} #ball-${ball.objectId}`,
      duration: 1,
      transformations: {
        left: `${ball.getUnwrappedField('cx') as number}%`,
        top: `${ball.getUnwrappedField('cy') as number}%`,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(1)
  }

  public logBallPaddleInteractions(_executionCtx: ExecutionContext) {
    if (this.gameInstance == undefined) {
      return
    }
    const ball = this.gameInstance.getField('ball') as BallInstance
    const paddle = this.gameInstance.getField('paddle') as PaddleInstance
    if (ball == undefined || paddle == undefined) {
      return
    }

    const ballBottom =
      (ball.getUnwrappedField('cy') as number) + (ball.getUnwrappedField('radius') as number)
    const ballMiddle = ball.getUnwrappedField('cx') as number
    const paddleTop =
      (paddle.getUnwrappedField('cy') as number) - (paddle.getUnwrappedField('height') as number) / 2
    const paddleLeft =
      (paddle.getUnwrappedField('cx') as number) - (paddle.getUnwrappedField('width') as number) / 2
    const paddleRight =
      (paddle.getUnwrappedField('cx') as number) + (paddle.getUnwrappedField('width') as number) / 2

    if (
      ballBottom == paddleTop &&
      ballMiddle >= paddleLeft &&
      ballMiddle <= paddleRight
    ) {
      this.paddleBallInteractionCount += 1
    } else if (ballBottom == paddleTop) {
      console.log(ballMiddle, paddleLeft, paddleRight)
    }
  }

  public moveBall(executionCtx: ExecutionContext, ball: BallInstance) {
    if (
      this.blocks.length > 0 &&
      this.blocks.every((block: BlockInstance) =>
        block.getUnwrappedField('smashed') as boolean
      )
    ) {
      executionCtx.logicError(
        "You shouldn't move the ball when there were no blocks remaining."
      )
    }
    const cx = ball.getUnwrappedField('cx') as number
    const cy = ball.getUnwrappedField('cy') as number
    const x_velocity = ball.getUnwrappedField('x_velocity') as number
    const y_velocity = ball.getUnwrappedField('y_velocity') as number
    const radius = ball.getUnwrappedField('radius') as number

    const newCx = cx + x_velocity
    const newCy = cy + y_velocity

    ball.setField('cx', new Jiki.Number(newCx))
    ball.setField('cy', new Jiki.Number(newCy))
    this.lastMovedItem = 'ball'

    this.ballPositions.push([newCx, newCy])

    if (newCx - radius < 0) {
      executionCtx.logicError(
        'Oh no! The ball moved off the left of the screen'
      )
    }
    if (newCx + radius > 100) {
      executionCtx.logicError(
        'Oh no! The ball moved off the right of the screen'
      )
    }
    if (newCy - radius < 0) {
      executionCtx.logicError('Oh no! The ball moved off the top of the screen')
    }
    if (newCy + radius > 100) {
      executionCtx.logicError(
        'Oh no! The ball moved off the bottom of the screen'
      )
    }

    this.addAnimation({
      targets: `#${this.getView().id} #ball-${ball.objectId}`,
      duration: 1,
      transformations: {
        left: `${newCx}%`,
        top: `${newCy}%`,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(1)

    this.logBallPaddleInteractions(executionCtx)
  }

  public gameOver(executionCtx: ExecutionContext) {
    // Check if all blocks are smashed to determine win/lose
    const allBlocksSmashed = this.blocks.length > 0 && 
      this.blocks.every((block: BlockInstance) => block.getUnwrappedField('smashed') as boolean)
    
    if (allBlocksSmashed) {
      this.result = 'win'
      this.gameOverWin(executionCtx)
    } else {
      this.result = 'lose'
      this.gameOverLose(executionCtx)
    }

    executionCtx.updateState({ gameOver: true })
  }

  private gameOverWin(executionCtx: ExecutionContext) {
    this.gameOverWinView = document.createElement('div')
    this.gameOverWinView.classList.add('game-over-win')
    this.gameOverWinView.style.opacity = '0'
    this.getView().appendChild(this.gameOverWinView)
    this.addAnimation({
      targets: `#${this.getView().id} .game-over-win`,
      duration: 100,
      transformations: {
        opacity: 0.9,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(100)
  }

  private gameOverLose(executionCtx: ExecutionContext) {
    this.gameOverLoseView = document.createElement('div')
    this.gameOverLoseView.classList.add('game-over-lose')
    this.gameOverLoseView.style.opacity = '0'
    this.getView().appendChild(this.gameOverLoseView)
    this.addAnimation({
      targets: `#${this.getView().id} .game-over-lose`,
      duration: 100,
      transformations: {
        opacity: 0.9,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(100)
  }

  // Setup Functions
  public setupBlocks(_: ExecutionContext, _layout: unknown[][]) {}

  public availableClasses = [
    this.Block,
    this.Ball,
    this.Paddle,
    this.Game,
    this.Circle,
    this.RoundedRectangle,
  ]

  public override availableFunctions = [
    {
      name: 'move_ball',
      func: (...args: unknown[]) => this.moveBall(args[0] as ExecutionContext, args[1] as Jiki.Instance),
      description: 'moved the ball by its velocities',
    },
    {
      name: 'game_over',
      func: (...args: unknown[]) => this.gameOver(args[0] as ExecutionContext),
      description: 'announced the game as over',
    },
  ]
}
