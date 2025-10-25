
import type { ExecutionContext } from '@/lib/interpreter/executor'
import { Exercise } from '../Exercise'
import { randomEmoji } from '../../test-runner/generateAndRunTestSuite/genericSetupFunctions'
import { isEqual } from 'lodash'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import { buildSquare, type SquareInstance } from './Square'

type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | string

export default class MazeExercise extends Exercise {
  private Square = buildSquare(this)

  private mazeLayout: SquareInstance[][] = []
  private initialMazeLayout: SquareInstance[][] = []
  private gridSize: number = 0
  protected characterPosition: { x: number; y: number } = { x: 0, y: 0 }
  private direction: string = 'down'
  private angle: number = 180
  private duration: number = 200
  private characterSelector: string = ''
  private squareSize: number = 0
  private character!: HTMLElement
  private cells!: HTMLElement
  private emojiMode: boolean = false
  private oopMode: boolean = false
  private randomEmojis: string[] = []
  private collectedEmojis: Record<string, number> = {}

  private startingAngles: Record<string, number> = { down: 180, up: 0, left: -90, right: 90 }

  public getState() {
    return {
      direction: this.direction,
      position: [this.characterPosition.x, this.characterPosition.y],
      collectedEmojis: this.collectedEmojis,
    }
  }

  public getGameResult() {
    return 'win'
  }

  public randomEmojisAllCollected() {
    // Turn array of emoji strings into a count map
    const expected = this.randomEmojis.reduce((acc: Record<string, number>, emoji: string) => {
      acc[emoji] = (acc[emoji] || 0) + 1
      return acc
    }, {})
    return isEqual(this.collectedEmojis, expected)
  }

  public constructor() {
    super('maze')

    this.container = document.createElement('div')
    this.view.appendChild(this.container)

    this.cells = document.createElement('div')
    this.cells.classList.add('cells')
    this.container.appendChild(this.cells)

    this.character = document.createElement('div')
    this.character.classList.add('character')
    this.container.appendChild(this.character)
    this.characterSelector = `#${this.view.id} .character`
    this.redrawMaze()


  }

  // Setup Functions
  public setupGrid(executionCtx: ExecutionContext, layout: Cell[][]) {
    layout = this.populateRandomEmojis(layout)
    this.mazeLayout = this.cellsToSquares(executionCtx, layout)
    this.initialMazeLayout = this.cellsToSquares(executionCtx, layout)

    this.gridSize = layout.length
    this.squareSize = 100 / layout.length
    this.redrawMaze()
  }
  private populateRandomEmojis(layout: Cell[][]): Cell[][] {
    const reservedEmojis = ['⬜', '🧱', '⭐', '🏁', '🔥', '💩']
    return layout.map((row) =>
      row.map((cell) => {
        if (cell != 6) {
          return cell
        }

        let emoji: string = ''
        do {
          const emojiResult = randomEmoji() as string
          if (emojiResult && !reservedEmojis.includes(emojiResult)) {
            emoji = emojiResult
          }
        } while (emoji === '')

        this.randomEmojis.push(emoji)
        return emoji
      })
    )
  }
  private cellsToSquares(
    executionCtx: ExecutionContext,
    layout: Cell[][]
  ): SquareInstance[][] {
    return layout.map((row, ridx) =>
      row.map((cell, cidx) => {
        if (cell === 0) {
          return this.Square.instantiate(executionCtx, [
            new Jiki.Number(ridx),
            new Jiki.Number(cidx),
            Jiki.True,
            Jiki.False,
            Jiki.False,
            Jiki.False,
            new Jiki.String(''),
          ])
        } else if (cell === 1) {
          return this.Square.instantiate(executionCtx, [
            new Jiki.Number(ridx),
            new Jiki.Number(cidx),
            Jiki.True,
            Jiki.False,
            Jiki.False,
            Jiki.True,
            new Jiki.String(''),
          ])
        } else if (cell === 2) {
          return this.Square.instantiate(executionCtx, [
            new Jiki.Number(ridx),
            new Jiki.Number(cidx),
            Jiki.True,
            Jiki.True,
            Jiki.False,
            Jiki.False,
            new Jiki.String(''),
          ])
        } else if (cell === 3) {
          return this.Square.instantiate(executionCtx, [
            new Jiki.Number(ridx),
            new Jiki.Number(cidx),
            Jiki.True,
            Jiki.False,
            Jiki.True,
            Jiki.False,
            new Jiki.String(''),
          ])
        } else if (cell === 4) {
          return this.Square.instantiate(executionCtx, [
            new Jiki.Number(ridx),
            new Jiki.Number(cidx),
            Jiki.True,
            Jiki.False,
            Jiki.False,
            Jiki.False,
            new Jiki.String('🔥'),
          ])
        } else if (cell === 5) {
          return this.Square.instantiate(executionCtx, [
            new Jiki.Number(ridx),
            new Jiki.Number(cidx),
            Jiki.True,
            Jiki.False,
            Jiki.False,
            Jiki.False,
            new Jiki.String('💩'),
          ])
        } else {
          return this.Square.instantiate(executionCtx, [
            new Jiki.Number(ridx),
            new Jiki.Number(cidx),
            Jiki.True,
            Jiki.False,
            Jiki.False,
            Jiki.False,
            new Jiki.String(cell.toString()),
          ])
        }
      })
    ) as SquareInstance[][]
  }

  public enableEmojiMode(_executionCtx: ExecutionContext) {
    this.emojiMode = true
  }
  public enableOOP(_executionCtx: ExecutionContext) {
    this.oopMode = true
  }

  private redrawMaze(): void {
    this.cells.innerHTML = ''
    this.view.style.setProperty('--gridSize', this.gridSize.toString())

    for (let y = 0; y < this.mazeLayout.length; y++) {
      const row = this.mazeLayout[y]
      if (!row) continue
      
      for (let x = 0; x < row.length; x++) {
        const square = row[x]
        if (!square) continue
        
        const contents = square.getUnwrappedField('contents') as string

        const cell = document.createElement('div')
        cell.classList.add('cell', `cell-${y}-${x}`)
        if (square.getUnwrappedField('is_start')) cell.classList.add('start')
        if (square.getUnwrappedField('is_finish')) cell.classList.add('target')
        if (square.getUnwrappedField('is_wall')) cell.classList.add('blocked')
        if (contents == '🔥') cell.classList.add('fire')
        if (contents == '💩') cell.classList.add('poop')

        const child = document.createElement('div')
        child.classList.add('emoji')
        child.textContent = contents.toString()
        cell.appendChild(child)
        this.cells.appendChild(cell)
      }
    }
  }

  public moveCharacter(executionCtx: ExecutionContext, dx: number, dy: number) {
    const newX = this.characterPosition.x + dx
    const newY = this.characterPosition.y + dy

    this.characterPosition.x = newX
    this.characterPosition.y = newY

    this.animateMove(executionCtx)
  }

  private animateMove(executionCtx: ExecutionContext) {
    const yRow = this.mazeLayout[this.characterPosition.y]
    if (!yRow) {
      executionCtx.logicError('Oh no, you tried to move off the map.')
      return
    }

    const square = yRow[this.characterPosition.x]

    // If we can't move, blow up
    if (!square) {
      executionCtx.logicError('Oh no, you tried to move off the map')
      return
    }

    // If we've hit a bad square, still animate but also animate color
    if (square.getUnwrappedField('is_wall')) {
      executionCtx.logicError('Ouch! You walked into a wall!')
      return
    }

    // If you hit an invalid square, blow up.
    else if (square.getUnwrappedField('contents') === '🔥') {
      executionCtx.logicError('Ouch! You walked into the fire!')
      return
    }

    // If you hit an invalid square, blow up.
    else if (square.getUnwrappedField('contents') === '💩') {
      executionCtx.logicError('Ewww! You walked into the poop! 💩💩💩')
      return
    } else if (square.getUnwrappedField('is_finish')) {
      this.gameOverWin(executionCtx)
    }

    this.addAnimation({
      targets: this.characterSelector,
      duration: this.duration,
      transformations: {
        left: `${this.characterPosition.x * this.squareSize}%`,
        top: `${this.characterPosition.y * this.squareSize}%`,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(this.duration)
  }

  private removeEmoji(executionCtx: ExecutionContext) {
    const yRow = this.mazeLayout[this.characterPosition.y]
    if (!yRow) return
    
    const square = yRow[this.characterPosition.x]
    if (!square) return
    
    const method = square.getMethod('remove_emoji')
    if (method && typeof method === 'function') {
      method(executionCtx, square)
    }
  }

  private gameOverWin(executionCtx: ExecutionContext) {
    this.addAnimation({
      targets: this.characterSelector,
      duration: 200,
      transformations: {
        backgroundColor: `#0f0`,
      },
      offset: executionCtx.getCurrentTime(),
    })
  }

  private animateRotate(executionCtx: ExecutionContext) {
    this.addAnimation({
      targets: this.characterSelector,
      duration: this.duration,
      transformations: {
        rotate: this.angle,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(this.duration)
  }

  public move(executionCtx: ExecutionContext) {
    switch (this.direction) {
      case 'up':
        this.moveCharacter(executionCtx, 0, -1)
        break
      case 'down':
        this.moveCharacter(executionCtx, 0, 1)
        break
      case 'right':
        this.moveCharacter(executionCtx, 1, 0)
        break
      case 'left':
        this.moveCharacter(executionCtx, -1, 0)
        break
      default:
        console.log(`Unknown direction: ${this.direction}`)
    }
  }

  public turnLeft(executionCtx: ExecutionContext) {
    this.angle -= 90

    if (this.direction == 'up') {
      this.direction = 'left'
    } else if (this.direction == 'down') {
      this.direction = 'right'
    } else if (this.direction == 'right') {
      this.direction = 'up'
    } else if (this.direction == 'left') {
      this.direction = 'down'
    }
    this.animateRotate(executionCtx)
  }

  public turnRight(executionCtx: ExecutionContext) {
    this.angle += 90

    if (this.direction == 'up') {
      this.direction = 'right'
    } else if (this.direction == 'down') {
      this.direction = 'left'
    } else if (this.direction == 'right') {
      this.direction = 'down'
    } else if (this.direction == 'left') {
      this.direction = 'up'
    }
    this.animateRotate(executionCtx)
  }

  private describeSquare(
    executionCtx: ExecutionContext,
    square: SquareInstance | undefined
  ): SquareInstance | Jiki.JikiString {
    if (!square) {
      if (this.oopMode) {
        return this.Square.instantiate(executionCtx, [
          new Jiki.JikiNumber(0),
          new Jiki.JikiNumber(0),
          Jiki.False,
          Jiki.False,
          Jiki.False,
          Jiki.False,
          new Jiki.JikiString(''),
        ]) as SquareInstance
      }
      return new Jiki.JikiString(this.emojiMode ? '🧱' : 'wall')
    }

    if (this.oopMode) {
      return square
    }

    let value: string
    if (square.getUnwrappedField('is_wall')) {
      value = this.emojiMode ? '🧱' : 'wall'
    } else if (square.getUnwrappedField('is_finish')) {
      value = this.emojiMode ? '🏁' : 'target'
    } else if (square.getUnwrappedField('is_start')) {
      value = this.emojiMode ? '⭐' : 'start'
    } else if (square.getUnwrappedField('contents') === '🔥') {
      value = this.emojiMode ? '🔥' : 'fire'
    } else if (square.getUnwrappedField('contents') === '💩') {
      value = this.emojiMode ? '💩' : 'poop'
    } else {
      if (this.emojiMode) {
        const contents = square.getUnwrappedField('contents') as string
        value = contents == '' ? '⬜' : contents
      } else {
        value = 'empty'
      }
    }
    return new Jiki.JikiString(value)
  }

  public canMoveToSquare(square: SquareInstance | undefined): Jiki.JikiBoolean {
    if (!square) {
      return Jiki.False
    }
    const contents = square.getUnwrappedField('contents')
    if (
      square.getUnwrappedField('is_wall') ||
      contents === '🔥' ||
      contents === '💩'
    ) {
      return Jiki.False
    }
    return Jiki.True
  }

  public canTurnLeft(_executionCtx: ExecutionContext): Jiki.JikiBoolean {
    return this.canMoveToSquare(this.lookLeft())
  }
  public canTurnRight(_executionCtx: ExecutionContext): Jiki.JikiBoolean {
    return this.canMoveToSquare(this.lookRight())
  }
  public canMove(_executionCtx: ExecutionContext): Jiki.JikiBoolean {
    return this.canMoveToSquare(this.lookAhead())
  }

  public lookLeft(): SquareInstance | undefined {
    let { x, y } = this.characterPosition

    if (this.direction === 'up') {
      x -= 1
    } else if (this.direction === 'down') {
      x += 1
    } else if (this.direction === 'left') {
      y += 1
    } else if (this.direction === 'right') {
      y -= 1
    }
    if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
      const row = this.mazeLayout[y]
      return row ? row[x] : undefined
    }
    return undefined
  }

  public lookRight(): SquareInstance | undefined {
    let { x, y } = this.characterPosition

    if (this.direction === 'up') {
      x += 1
    } else if (this.direction === 'down') {
      x -= 1
    } else if (this.direction === 'left') {
      y -= 1
    } else if (this.direction === 'right') {
      y += 1
    }
    if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
      const row = this.mazeLayout[y]
      return row ? row[x] : undefined
    }
    return undefined
  }

  private lookAhead(): SquareInstance | undefined {
    let { x, y } = this.characterPosition

    if (this.direction === 'up') {
      y -= 1
    } else if (this.direction === 'down') {
      y += 1
    } else if (this.direction === 'left') {
      x -= 1
    } else if (this.direction === 'right') {
      x += 1
    }
    if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
      const row = this.mazeLayout[y]
      return row ? row[x] : undefined
    }
    return undefined
  }

  private look(
    executionCtx: ExecutionContext,
    direction: Jiki.JikiString
  ): SquareInstance | Jiki.JikiString {
    if (direction.value === 'down') {
      const row = this.mazeLayout[this.characterPosition.y]
      const square = row ? row[this.characterPosition.x] : undefined
      return this.describeSquare(executionCtx, square)
    }

    let square: SquareInstance | undefined
    if (direction.value === 'left') {
      square = this.lookLeft()
    } else if (direction.value === 'right') {
      square = this.lookRight()
    } else if (direction.value === 'ahead') {
      square = this.lookAhead()
    } else {
      executionCtx.logicError(
        `You asked the blob to look in a direction it doesn't know about. It can only look \"left\", \"right\", or \"ahead\". You asked it to look \"${direction.value}\".`
      )
      return new Jiki.JikiString('')
    }
    return this.describeSquare(executionCtx, square)
  }

  public getInitialMaze(_executionCtx: ExecutionContext): SquareInstance[][] {
    return this.initialMazeLayout
  }

  public setupDirection(_executionCtx: ExecutionContext, direction: string) {
    this.direction = direction
    const angle = this.startingAngles[direction]
    if (angle !== undefined) {
      this.angle = angle
      this.character.style.transform = `rotate(${this.angle}deg)`
    }
  }
  public setupPosition(_executionCtx: ExecutionContext, x: number, y: number) {
    this.characterPosition = { x, y }
    this.character.style.left = `${this.characterPosition.x * this.squareSize}%`
    this.character.style.top = `${this.characterPosition.y * this.squareSize}%`
  }
  public announceEmojis(_executionCtx: ExecutionContext, emojis: Jiki.JikiDictionary) {
    this.collectedEmojis = emojis.value as Record<string, number>
  }

  public override availableFunctions = [
    {
      name: 'move',
      func: (...args: unknown[]) => this.move(args[0] as ExecutionContext),
      description: 'moved the character one step forward',
    },
    {
      name: 'turn_left',
      func: (...args: unknown[]) => this.turnLeft(args[0] as ExecutionContext),
      description: 'turned the character to the left',
    },
    {
      name: 'turn_right',
      func: (...args: unknown[]) => this.turnRight(args[0] as ExecutionContext),
      description: 'turned the character to the right',
    },
    {
      name: 'can_turn_left',
      func: (...args: unknown[]) => this.canTurnLeft(args[0] as ExecutionContext),
      description: 'checked if the character can turn left',
    },
    {
      name: 'can_turn_right',
      func: (...args: unknown[]) => this.canTurnRight(args[0] as ExecutionContext),
      description: 'checked if the character can turn right',
    },
    {
      name: 'can_move',
      func: (...args: unknown[]) => this.canMove(args[0] as ExecutionContext),
      description: 'checked if the character can move forward',
    },
    {
      name: 'look',
      func: (...args: unknown[]) => this.look(args[0] as ExecutionContext, args[1] as Jiki.JikiString),
      description: 'looked in a direction and returns what is there',
    },
    {
      name: 'get_initial_maze',
      func: (...args: unknown[]) => this.getInitialMaze(args[0] as ExecutionContext),
      description: 'get the initial maze layout',
    },
    {
      name: 'announce_emojis',
      func: (...args: unknown[]) => this.announceEmojis(args[0] as ExecutionContext, args[1] as Jiki.JikiDictionary),
      description: 'announced the emojis that had been collected',
    },
    {
      name: 'remove_emoji',
      func: (...args: unknown[]) => this.removeEmoji(args[0] as ExecutionContext),
      description: 'removed the emoji from the current square',
    },
  ]
}
