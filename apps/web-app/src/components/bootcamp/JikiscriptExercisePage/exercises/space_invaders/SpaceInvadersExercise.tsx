
import { Exercise } from '../Exercise'
import { ExecutionContext } from '@/lib/interpreter/executor'
import { cloneDeep } from 'lodash'

import { isNumber } from '@/lib/interpreter/checks'
import { extractFunctionCallExpressions } from '../../test-runner/generateAndRunTestSuite/checkers'
import { Statement } from '@/lib/interpreter/statement'
import { InterpretResult } from '@/lib/interpreter/interpreter'
import * as Jiki from '@/lib/interpreter/jikiObjects'



type GameStatus = 'running' | 'won' | 'lost'
type AlienStatus = 'alive' | 'dead'
class Alien {
  public status: AlienStatus
  public lastKilledAt?: number
  public respawnsAt?: number

  public constructor(
    public elem: HTMLElement,
    public row: number,
    public col: number,
    public type: number
  ) {
    this.status = 'alive'
  }

  public isAlive(time: number) {
    if (this.status == 'alive') {
      return true
    }
    if (this.respawnsAt === undefined) {
      return false
    }

    return time > this.respawnsAt
  }
}

export default class SpaceInvadersExercise extends Exercise {
  private gameStatus: GameStatus = 'running'
  private moveDuration = 200
  private shotDuration = 1000

  private minLaserPosition = 0
  private maxLaserPosition = 10
  private laserStart = 12
  private laserStep = 7.5
  private laserPositions = Array.from(
    { length: this.maxLaserPosition + 1 },
    (_, idx) => this.laserStart + idx * this.laserStep
  )
  private laserPosition = 0
  private features = { alienRespawning: false }
  private aliens: (Alien | null)[][] = []
  private startingAliens: (Alien | null)[][] = []
  private laser!: HTMLElement
  private lastShotAt: number = 0

  public constructor() {
    super('space-invaders')

    this.laser = document.createElement('div')
    this.laser.classList.add('laser')
    this.laser.style.left = `${this.laserPositions[this.laserPosition]}%`
    this.view.appendChild(this.laser)
  }

  public getState() {
    return { gameStatus: this.gameStatus }
  }

  public setupAliens(_executionCtx: ExecutionContext, rows: number[][]) {
    this.aliens = rows.map((row: number[], rowIdx: number) => {
      return row.map((type: number, colIdx: number) => {
        if (type === 0) return null
        return this.addAlien(rowIdx, colIdx, type)
      })
    })
    this.startingAliens = cloneDeep(this.aliens)
  }

  public enableAlienRespawning() {
    this.features.alienRespawning = true
  }

  private addAlien(row: number, col: number, type: number) {
    const alien = document.createElement('div')
    alien.classList.add('alien')
    alien.id = `alien-${Math.random().toString(36).slice(2, 11)}`
    alien.style.left = `${this.laserStart + col * this.laserStep}%`
    alien.style.top = `${10 + row * 11}%`

    const parts = ['tl', 'tr', 'bl', 'br']
    parts.forEach((pos) => {
      const part = document.createElement('div')
      part.classList.add(pos)
      alien.appendChild(part)
    })
    this.view.appendChild(alien)

    return new Alien(alien, row, col, type)
  }

  private killAlien(
    executionCtx: ExecutionContext,
    alien: Alien,
    shot: HTMLElement
  ) {
    const deathTime = executionCtx.getCurrentTime() + this.shotDuration
    alien.status = 'dead'
    alien.lastKilledAt = deathTime
    ;[
      ['tl', -10, -10, -180],
      ['tr', 10, -10, 180],
      ['bl', -10, 10, -180],
      ['br', 10, 10, 180],
    ].forEach(([pos, x, y, rotate]) => {
      this.addAnimation({
        targets: `#${this.view.id} #${alien.elem.id} .${pos}`,
        duration: 300,
        transformations: {
          translateX: x,
          translateY: y,
          rotate: rotate,
          opacity: 0,
        },
        offset: deathTime,
      })
    })
    this.addAnimation({
      targets: `#${this.view.id} #${shot.id}`,
      duration: 1,
      transformations: { opacity: 0 },
      offset: deathTime,
    })
    executionCtx.fastForward(1)
    this.respawnAlien(executionCtx, alien)
  }

  private respawnAlien(executionCtx: ExecutionContext, alien: Alien) {
    if (!this.features.alienRespawning) {
      return
    }

    // Only respawn each alien once
    if (alien.respawnsAt !== undefined) {
      delete alien.respawnsAt
      return
    }

    // Stop respawning aliens after the first few seconds
    if (executionCtx.getCurrentTime() > 5000) {
      return
    }

    // Skip 80% of the time
    if (Math.random() > 0.3) {
      return
    }

    const respawnsAt = executionCtx.getCurrentTime() + this.shotDuration + 1000
    alien.respawnsAt = respawnsAt
    ;['tl', 'tr', 'bl', 'br'].forEach((pos) => {
      this.addAnimation({
        targets: `#${this.view.id} #${alien.elem.id} .${pos}`,
        duration: 1,
        transformations: { translateX: 0, translateY: 0, rotate: 0 },
        offset: respawnsAt,
      })
      this.addAnimation({
        targets: `#${this.view.id} #${alien.elem.id} .${pos}`,
        duration: 100,
        transformations: { opacity: 1 },
        offset: respawnsAt,
      })
    })
  }

  private moveLaser(executionCtx: ExecutionContext) {
    this.addAnimation({
      targets: `#${this.view.id} .laser`,
      duration: this.moveDuration,
      transformations: {
        opacity: 1,
        left: `${this.laserPositions[this.laserPosition]}%`,
      },
      offset: executionCtx.getCurrentTime(),
    })
    executionCtx.fastForward(this.moveDuration)
  }

  private allAliensDead(executionCtx: ExecutionContext) {
    return this.aliens.every((row) =>
      row.every(
        (alien) =>
          alien === null || !alien.isAlive(executionCtx.getCurrentTime())
      )
    )
  }

  private checkForWin(executionCtx: ExecutionContext) {
    if (this.allAliensDead(executionCtx)) {
      this.gameStatus = 'won'
    }
  }

  public isAlienAbove(executionCtx: ExecutionContext): Jiki.JikiBoolean {
    return new Jiki.JikiBoolean(
      this.aliens.some((row: (Alien | null)[]) => {
        const alien = row[this.laserPosition]
        if (alien === null) {
          return false
        }
        return alien ? alien.isAlive(executionCtx.getCurrentTime()) : false
      })
    )
  }

  public shoot(executionCtx: ExecutionContext) {
    if (this.lastShotAt > executionCtx.getCurrentTime() - 50) {
      executionCtx.logicError(
        'Oh no! Your laser canon overheated from shooting too fast! You need to move before you can shoot a second time.'
      )
    }
    this.lastShotAt = executionCtx.getCurrentTime()

    let targetRow: number | null = null
    let targetAlien: Alien | null = null
    this.aliens.forEach((row: (Alien | null)[], rowIdx: number) => {
      const alien = row[this.laserPosition]
      if (alien == null) {
        return
      }
      if (!alien.isAlive(executionCtx.getCurrentTime())) {
        return
      }

      targetRow = rowIdx
      targetAlien = alien
    })

    let targetTop: string | number
    if (targetRow === null) {
      targetTop = -10
    } else {
      targetTop = `${10 + targetRow * 11}%`
    }

    // TODO: Vary speed based on distance
    const duration = this.shotDuration

    const shot = document.createElement('div')
    shot.classList.add('shot')
    shot.id = `shot-${Math.random().toString(36).slice(2, 11)}`
    shot.style.left = `${this.laserPositions[this.laserPosition]}%`
    shot.style.top = '85%'
    shot.style.opacity = '0'
    this.view.appendChild(shot)

    this.addAnimation({
      targets: `#${this.view.id} #${shot.id}`,
      duration: 1,
      transformations: { opacity: 1 },
      offset: executionCtx.getCurrentTime(),
    })
    this.addAnimation({
      targets: `#${this.view.id} #${shot.id}`,
      duration: duration,
      transformations: { top: targetTop as number },
      offset: executionCtx.getCurrentTime(),
      easing: 'linear',
    })

    if (targetAlien === null) {
      executionCtx.logicError('Oh no, you missed. Wasting ammo is not allowed!')
      this.gameStatus = 'lost'
    } else {
      this.killAlien(executionCtx, targetAlien, shot)

      // Let the bullet leave the laser before moving
      executionCtx.fastForward(30)

      this.checkForWin(executionCtx)
    }
  }

  public moveLeft(executionCtx: ExecutionContext) {
    if (this.laserPosition == this.minLaserPosition) {
      executionCtx.logicError('Oh no, you tried to move off the edge!')
      return
    }

    this.laserPosition -= 1
    this.moveLaser(executionCtx)
  }

  public moveRight(executionCtx: ExecutionContext) {
    if (this.laserPosition == this.maxLaserPosition) {
      executionCtx.logicError('Oh no, you tried to move off the edge!')
      return
    }

    this.laserPosition += 1
    this.moveLaser(executionCtx)
  }

  public getStartingAliensInRow(
    executionCtx: ExecutionContext,
    row: Jiki.JikiNumber
  ): Jiki.JikiList {
    if (!isNumber(row.value)) {
      executionCtx.logicError(
        'Oh no, the row input you provided is not a number.'
      )
      return new Jiki.JikiList([])
    }

    const rowValue = row.value as number
    if (rowValue < 1 || rowValue > this.startingAliens.length) {
      executionCtx.logicError(
        `Oh no, you tried to access a row of aliens that doesn't exist. You asked for row ${rowValue}, but there are only ${this.startingAliens.length} rows of aliens.`
      )
      return new Jiki.JikiList([])
    }

    const rowData = this.startingAliens.slice().reverse()[rowValue - 1]
    if (!rowData) {
      return new Jiki.JikiList([])
    }
    
    return new Jiki.JikiList(
      rowData
        .map((alien: Alien | null) => alien !== null)
        .map((alive: boolean) => ({ type: 'Boolean', value: alive } as Jiki.JikiObject))
    )
  }

  public getStartingAliens(_executionCtx: ExecutionContext) {
    return this.startingAliens.map((row: (Alien | null)[]) => row.map(Boolean))
  }

  public override fireFireworks(executionCtx: ExecutionContext, startTime?: number) {
    if (!this.allAliensDead(executionCtx)) {
      executionCtx.logicError(
        'You need to defeat all the aliens before you can celebrate!'
      )
    }
    super.fireFireworks(
      executionCtx,
      startTime || executionCtx.getCurrentTime() + this.shotDuration
    )

    executionCtx.fastForward(2500)
  }

  public wasFireworksCalledInsideRepeatLoop(result: InterpretResult): boolean {
    const callsInsideRepeat = (statements: unknown[]): unknown[] =>
      statements
        .filter((obj: unknown) => obj)
        .map((elem: unknown) => {
          const element = elem as { type?: string; body?: unknown[]; children?: () => unknown[] }
          if (element.type === 'RepeatUntilGameOverStatement') {
            const body = element.body || element.children?.() || []
            return extractFunctionCallExpressions(body as Statement[]).filter(
              (expr: { callee?: { name?: { lexeme?: string } } }) => expr.callee?.name?.lexeme === 'fire_fireworks'
            )
          }
          const children = element.children?.() || []
          return callsInsideRepeat(children)
        })
        .flat()

    const callsOutsideRepeat = (statements: unknown[]): unknown[] =>
      statements
        .filter((obj: unknown) => obj)
        .map((elem: unknown) => {
          const element = elem as { type?: string; children?: () => unknown[] }
          if (element.type === 'RepeatUntilGameOverStatement') {
            return []
          }
          const children = element.children?.() || []
          return callsOutsideRepeat(children)
        })
        .flat()

    const statements = (result.meta as { statements?: unknown[] })?.statements || []
    return (
      callsInsideRepeat(statements).length > 0 &&
      callsOutsideRepeat(statements).length === 0
    )
  }

  public override availableFunctions = [
    {
      name: 'move_left',
      func: (...args: unknown[]) => this.moveLeft(args[0] as ExecutionContext),
      description: 'moved the laser canon to the left',
    },
    {
      name: 'moveLeft',
      func: (...args: unknown[]) => this.moveLeft(args[0] as ExecutionContext),
      description: 'moved the laser canon to the left',
    },
    {
      name: 'move_right',
      func: (...args: unknown[]) => this.moveRight(args[0] as ExecutionContext),
      description: 'moved the laser canon to the right',
    },
    {
      name: 'moveRight',
      func: (...args: unknown[]) => this.moveRight(args[0] as ExecutionContext),
      description: 'moved the laser canon to the right',
    },
    {
      name: 'shoot',
      func: (...args: unknown[]) => this.shoot(args[0] as ExecutionContext),
      description: 'shot the laser upwards',
    },
    {
      name: 'is_alien_above',
      func: (...args: unknown[]) => this.isAlienAbove(args[0] as ExecutionContext),
      description: 'determined if there was an alien above the laser canon',
    },
    {
      name: 'get_starting_aliens_in_row',
      func: (...args: unknown[]) => this.getStartingAliensInRow(args[0] as ExecutionContext, args[1] as Jiki.JikiNumber),
      description: 'retrieved the starting positions of row ${arg1} of aliens',
    },
    {
      name: 'getStartingAliens',
      func: (...args: unknown[]) => this.getStartingAliens(args[0] as ExecutionContext),
      description: 'retrieved the starting positions of row ${arg1} of aliens',
    },
    {
      name: 'fire_fireworks',
      func: (...args: unknown[]) => this.fireFireworks(args[0] as ExecutionContext),
      description: 'fired off celebratory fireworks',
    },
  ]
}
