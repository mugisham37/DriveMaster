declare module '@juliangarnierorg/anime-beta' {
  export interface AnimationOptions {
    duration?: number
    ease?: string
    delay?: number
    onUpdate?: () => void
    onComplete?: () => void
    onBegin?: () => void
    [key: string]: unknown
  }

  export type TargetsParam = string | Element | Element[] | NodeList | HTMLCollection

  export interface Timeline {
    duration: number
    currentTime: number
    paused: boolean
    completed: boolean
    
    add(targets: TargetsParam, properties: Record<string, unknown>, offset?: string | number): Timeline
    play(): Timeline
    pause(): Timeline
    restart(): Timeline
    reverse(): Timeline
    seek(time: number): Timeline
  }

  export interface TimelineOptions {
    defaults?: AnimationOptions
    autoplay?: boolean
    onUpdate?: (timeline: Timeline) => void
    onBegin?: (timeline: Timeline) => void
    onComplete?: (timeline: Timeline) => void
    onPause?: (timeline: Timeline) => void
  }

  export function animate(
    target: TargetsParam,
    options: AnimationOptions
  ): void

  export function createTimeline(options?: TimelineOptions): Timeline
  
  export function stagger(
    value: number | number[], 
    options?: Record<string, unknown>
  ): (el: Element, index: number) => number
}