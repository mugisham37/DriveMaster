export type Task = {
  name: string
  instructionsHtml: string
  status: 'active' | 'completed' | 'inactive'
  projectType?: string
  testsType: TestsType
  tests: TaskTest[]
  bonus?: boolean
}

export type TestsType = 'io' | 'state'

export type TaskTest = {
  name: string
  slug: string
  data: unknown
  imageSlug?: string
  codeRun?: string
  function?: string
  expression?: string
  args?: unknown[]
  type?: TestsType
  checks?: ExpectCheck[]
  setupFunctions: SetupFunction[]
  descriptionHtml?: string
}

export type ExpectCheck =
  | ExpectCheckProperty
  | ExpectCheckFunction
  | ExpectCheckReturn

export type ExpectCheckProperty = {
  property: string
  value?: unknown
  matcher?: AvailableMatchers
  errorHtml?: string
  codeRun?: string
}

export type ExpectCheckFunction = {
  function: string
  args?: unknown[]
  value?: unknown
  matcher?: AvailableMatchers
  errorHtml?: string
  codeRun?: string
}

export type ExpectCheckReturn = {
  value: unknown
  matcher?: AvailableMatchers
  errorHtml?: string
}

export type SetupFunction = [functionName: keyof Exercise, params?: unknown[]]
