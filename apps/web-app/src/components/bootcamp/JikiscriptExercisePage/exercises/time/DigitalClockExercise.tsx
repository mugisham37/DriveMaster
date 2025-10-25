import { Exercise } from '../Exercise'
import { ExecutionContext, ExternalFunction } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'

export default class DigitalClockExercise extends Exercise {
  private displayedTime?: string
  private hours: number
  private minutes: number

  public constructor() {
    super('digital-clock')

    const time = new Date()
    this.hours = time.getHours()
    this.minutes = time.getMinutes()

    this.timeElem = document.createElement('div')
    this.timeElem.classList.add('time')
    this.view.appendChild(this.timeElem)

    this.hourElem = document.createElement('div')
    this.hourElem.classList.add('hour')
    this.timeElem.appendChild(this.hourElem)

    this.h1Elem = document.createElement('div')
    this.h1Elem.classList.add('h1')
    this.hourElem.appendChild(this.h1Elem)

    this.h2Elem = document.createElement('div')
    this.h2Elem.classList.add('h2')
    this.hourElem.appendChild(this.h2Elem)

    this.colonElem = document.createElement('div')
    this.colonElem.classList.add('colon')
    this.colonElem.innerText = ':'
    this.timeElem.appendChild(this.colonElem)

    this.minuteElem = document.createElement('div')
    this.minuteElem.classList.add('minute')
    this.timeElem.appendChild(this.minuteElem)

    this.m1Elem = document.createElement('div')
    this.m1Elem.classList.add('m1')
    this.minuteElem.appendChild(this.m1Elem)

    this.m2Elem = document.createElement('div')
    this.m2Elem.classList.add('m2')
    this.minuteElem.appendChild(this.m2Elem)

    this.meridiem = document.createElement('div')
    this.meridiem.classList.add('meridiem')
    this.view.appendChild(this.meridiem)
  }

  public getState() {
    return { displayedTime: this.displayedTime }
  }
  public setTime(_: ExecutionContext, hours: number, minutes: number) {
    this.hours = hours
    this.minutes = minutes
  }

  public didDisplayCurrentTime(_executionCtx: ExecutionContext) {
    if (this.displayedTime === undefined) {
      return false
    }

    let normalisedHours = this.hours
    const ampm = this.hours >= 12 ? 'pm' : 'am'
    if (this.hours == 0) {
      normalisedHours = 12
    } else if (this.hours > 12) {
      normalisedHours = this.hours - 12
    }

    return this.displayedTime == `${normalisedHours}:${this.minutes}${ampm}`
  }
  public currentTimeHour(_executionCtx: ExecutionContext): Jiki.JikiNumber {
    return new Jiki.JikiNumber(this.hours)
  }
  public currentTimeMinute(_executionCtx: ExecutionContext): Jiki.JikiNumber {
    return new Jiki.JikiNumber(this.minutes)
  }
  public displayTime(
    _executionCtx: ExecutionContext,
    hours: Jiki.JikiString,
    mins: Jiki.JikiString,
    ampm: Jiki.JikiString
  ) {
    this.displayedTime = `${hours.value}:${mins.value}${ampm.value}`

    const [h1, h2] = String(hours.value).padStart(2, '0').split('')
    const [m1, m2] = String(mins.value).padStart(2, '0').split('')

    if (this.h1Elem) this.h1Elem.innerText = h1 || '0'
    if (this.h2Elem) this.h2Elem.innerText = h2 || '0'
    if (this.m1Elem) this.m1Elem.innerText = m1 || '0'
    if (this.m2Elem) this.m2Elem.innerText = m2 || '0'

    if (ampm.value === 'am' || ampm.value === 'pm') {
      if (this.meridiem) this.meridiem.innerText = ampm.value
      if (this.meridiem) this.meridiem.classList.add(ampm.value)
    }
  }

  public override availableFunctions: ExternalFunction[] = [
    {
      name: 'current_time_hour',
      func: (...args: unknown[]) => this.currentTimeHour(args[0] as ExecutionContext),
      description: 'Returns the current hour',
    },
    {
      name: 'current_time_minute',
      func: (...args: unknown[]) => this.currentTimeMinute(args[0] as ExecutionContext),
      description: 'Returns the current minute',
    },
    {
      name: 'display_time',
      func: (...args: unknown[]) => this.displayTime(
        args[0] as ExecutionContext,
        args[1] as Jiki.JikiString,
        args[2] as Jiki.JikiString,
        args[3] as Jiki.JikiString
      ),
      description: 'Writes the hour, minute and am/pm onto the digital display',
    },
  ]

  public getExerciseSpecificFunctions() {
    return []
  }
}
