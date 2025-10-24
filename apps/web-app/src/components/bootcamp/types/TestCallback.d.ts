import { Frame } from '@/lib/interpreter/frames'
declare global {
  type TestCallback = () => {
    slug: string
    expects: MatcherResult[]
    codeRun: string
    frames: Frame[]
    animationTimeline: TAnimationTimeline
    type: TestsType
    view?: HTMLElement
    imageSlug?: string
    logMessages?: unknown[]
  }
}

export {}
