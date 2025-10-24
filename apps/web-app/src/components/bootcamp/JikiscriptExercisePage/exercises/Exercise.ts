import type { Animation } from '../AnimationTimeline/AnimationTimeline'
import type { ExecutionContext, ExternalFunction } from '@/lib/interpreter/executor'
import { InterpretResult } from '@/lib/interpreter/interpreter'
import checkers from '../test-runner/generateAndRunTestSuite/checkers'

export abstract class Exercise {
  public showAnimationsOnInfiniteLoops: boolean
  public availableFunctions!: ExternalFunction[]
  public animations: Animation[] = []
  public abstract getState(): Record<string, unknown> | null
  // allow dynamic method access
  [key: string]: unknown

  protected view!: HTMLElement
  protected container!: HTMLElement
  public static hasView = true

  // DOM element properties for exercises that need them
  protected timeElem?: HTMLElement
  protected hourElem?: HTMLElement
  protected h1Elem?: HTMLElement
  protected h2Elem?: HTMLElement
  protected colonElem?: HTMLElement
  protected minuteElem?: HTMLElement
  protected m1Elem?: HTMLElement
  protected m2Elem?: HTMLElement
  protected meridiem?: HTMLElement
  protected tooltip?: HTMLElement
  protected game?: unknown

  public constructor(private slug?: string) {
    if (slug) {
      this.createView()
    }
    this.showAnimationsOnInfiniteLoops = true
  }

  public wrapCode(code: string) {
    return code
  }

  public numFunctionCalls(
    result: InterpretResult,
    name: string,
    args: unknown[] | null
  ): number {
    return checkers.numFunctionCalls(result, name, args)
  }

  public wasFunctionCalled(
    result: InterpretResult,
    name: string,
    args: unknown[] | null
  ): boolean {
    return checkers.wasFunctionCalled(result, name, args)
  }

  public numFunctionCallsInCode(
    result: InterpretResult,
    fnName: string
  ): number {
    return checkers.numFunctionCallsInCode(result, fnName)
  }

  public numStatements(result: InterpretResult): number {
    return checkers.numStatements(result)
  }

  public numTimesStatementUsed(result: InterpretResult, type: string): number {
    return checkers.numTimesStatementUsed(result, type)
  }

  public numLinesOfCode(
    result: InterpretResult,
    numStubLines: number = 0
  ): number {
    return checkers.numLinesOfCode(result, numStubLines)
  }

  public addAnimation(animation: Animation) {
    this.animations.push(animation)
  }

  protected createView() {
    const cssClass = `exercise-${this.slug}`
    this.view = document.createElement('div')
    this.view.id = `${cssClass}-${Math.random().toString(36).substring(2, 11)}`
    this.view.classList.add('exercise-container')
    this.view.classList.add(cssClass)
    this.view.style.display = 'none'
    document.body.appendChild(this.view)
  }

  public getView(): HTMLElement {
    return this.view
  }

  public animateIntoView(
    executionCtx: ExecutionContext,
    targets: string,
    options = { duration: 1, offset: 0 }
  ) {
    this.addAnimation({
      targets,
      duration: options.duration,
      transformations: {
        opacity: 1,
      },
      offset: executionCtx.getCurrentTime() + options.offset,
    })
    executionCtx.fastForward(1)
  }

  public animateOutOfView(
    executionCtx: ExecutionContext,
    targets: string,
    options = { duration: 1, offset: 0 }
  ) {
    this.addAnimation({
      targets,
      duration: options.duration,
      transformations: {
        opacity: 0,
      },
      offset: executionCtx.getCurrentTime() + options.offset,
    })
    executionCtx.fastForward(1)
  }

  protected fireFireworks(_: ExecutionContext, startTime: number) {
    const fireworks = document.createElement('div')
    fireworks.classList.add('fireworks')
    fireworks.style.opacity = '0'
    fireworks.innerHTML = `
      <div class="before"></div>
      <div class="after"></div>
    `
    this.view.appendChild(fireworks)

    this.addAnimation({
      targets: `#${this.view.id} .fireworks`,
      duration: 1,
      transformations: {
        opacity: 1,
      },
      offset: startTime,
    })
    this.addAnimation({
      targets: `#${this.view.id} .fireworks`,
      duration: 1,
      transformations: {
        opacity: 0,
      },
      offset: startTime + 2500,
    })
  }
}
