// Enhanced type definitions for Jikiscript Exercise Page components

import { JikiscriptValue } from '@/lib/interpreter/frames'

// Configuration types
export interface Config {
  projectType: string
  [key: string]: unknown
}

// Task and test types
export interface TaskTest {
  imageSlug?: string
  setupFunctions?: Array<[string, unknown[]]>
  checks?: ExpectCheck[]
  [key: string]: unknown
}

export interface TestSuiteResult<T = unknown> {
  status: 'success' | 'error' | 'pending'
  result?: T
  error?: Error
  [key: string]: unknown
}

// Expect check types
export interface ExpectCheckBase {
  matcher?: AvailableMatchers
  expected?: JikiscriptValue
  errorHtml?: string
  value?: JikiscriptValue
  codeRun?: string
}

export interface ExpectCheckFunction extends ExpectCheckBase {
  function: string
  args?: unknown[]
}

export interface ExpectCheckProperty extends ExpectCheckBase {
  property: string
}

export type ExpectCheck = ExpectCheckFunction | ExpectCheckProperty

// Enhanced Frame type with proper typing
export interface EnhancedFrame {
  timelineTime: number
  line: number
  status: 'success' | 'error' | 'pending'
  result?: JikiscriptValue
  error?: Error
  description?: string
  location?: {
    line: number
    column?: number
  }
}

// Animation Timeline types
export interface AnimationTimelineInstance {
  timeline: {
    currentTime: number
    duration: number
  }
  duration: number
  progress: number
  currentTime: number
  paused: boolean
  completed: boolean
  hasPlayedOrScrubbed?: boolean
  
  play(): void
  pause(): void
  seek(time: number): void
  seekEndOfTimeline(): void
  onUpdate(callback: (anime: AnimationTimelineInstance) => void): void
}

// Exercise and Project types
export interface ExerciseState {
  [key: string]: JikiscriptValue
}

export interface ExerciseInstance {
  getView(): HTMLElement | null
  getState(): ExerciseState
  [functionName: string]: unknown
}

export interface ProjectConstructor {
  new (): ExerciseInstance
}

// Confetti types
export interface ConfettiInstance {
  (options: ConfettiOptions): void
}

export interface ConfettiOptions {
  particleCount?: number
  angle?: number
  spread?: number
  origin?: { x: number; y: number }
  colors?: string[]
}

export interface ConfettiStatic {
  create(canvas: HTMLCanvasElement, options: { resize: boolean }): ConfettiInstance
}

// Function setup types
export type FunctionSetupData = [string, unknown[]?]

// Interpreter result types
export interface InterpretResult {
  meta: {
    functionCallLog: Record<string, unknown[][]>
    statements: unknown[]
    sourceCode: string
  }
  output?: unknown
}

// Test runner types
export interface TestRunnerOptions {
  [key: string]: unknown
}

// Editor types
export interface EditorStateSetters {
  setUnderlineRange: (range: { from: number; to: number }) => void
  setHighlightedLine: (line: number) => void
  setHighlightedLineColor: (color: string) => void
  setShouldShowInformationWidget: (shouldShow: boolean) => void
  setInformationWidgetData: (data: InformationWidgetData) => void
}

export interface InformationWidgetData {
  html: string
  line: number
  status: 'SUCCESS' | 'ERROR'
}

// Additional types for test runner
export interface TaskTest {
  name: string
  slug: string
  descriptionHtml?: string
  function?: string
  args?: unknown[]
  expression?: string
  codeRun?: string
  imageSlug?: string
  setupFunctions?: Array<[string, unknown[]]>
  checks?: ExpectCheck[]
  [key: string]: unknown
}

export type TestCallback = () => {
  expects: MatcherResult[]
  slug: string
  codeRun: string
  frames: EnhancedFrame[]
  type: string
  animationTimeline?: AnimationTimelineInstance
  logMessages: unknown[]
  imageSlug?: string
  view?: HTMLElement
}

export interface SetupFunction extends Array<unknown> {
  0: string // function name
  1?: unknown[] // parameters
}

export interface NewTestResult {
  frames: EnhancedFrame[]
  animationTimeline?: AnimationTimelineInstance
}