import { LanguageFeatures } from '@/lib/interpreter/interpreter'

declare global {
  type JikiscriptExercisePageProps = {
    solution: Solution
    project: Project
    exercise: Exercise
    code: Code
    links: {
      postSubmission: string
      completeSolution: string
      projectsIndex: string
      dashboardIndex: string
      bootcampLevelUrl: string
      updateCustomFns?: string
      customFnsDashboard?: string
      deleteCustomFn?: string
    }
    customFunctions: CustomFunctionsFromServer
  }

  type Task = {
    name: string
    instructionsHtml: string
    status: 'active' | 'completed' | 'inactive'
    projectType?: string
    testsType: TestsType
    tests: TaskTest[]
    bonus?: boolean
  }

  type TestsType = 'io' | 'state'

  type TaskTest = {
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

  type ExpectCheck =
    | ExpectCheckProperty
    | ExpectCheckFunction
    | ExpectCheckReturn

  type ExpectCheckProperty = {
    property: string
    value?: unknown
    matcher?: AvailableMatchers
    errorHtml?: string
    codeRun?: string
  }

  type ExpectCheckFunction = {
    function: string
    args?: unknown[]
    value?: unknown
    matcher?: AvailableMatchers
    errorHtml?: string
    codeRun?: string
  }

  type ExpectCheckReturn = {
    value: unknown
    matcher?: AvailableMatchers
    errorHtml?: string
  }

  type SetupFunction = [functionName: keyof Exercise, params?: unknown[]]

  type CustomFunctionsFromServer = {
    selected: string[]
    forInterpreter: CustomFunctionForInterpreter[]
  }

  type CustomFunctionForInterpreter = {
    dependsOnCurrentFunction?: boolean
    name: string
    arity: number
    code: string
    description: string
    dependencies: string[]
  }

  type Code = {
    stub: string
    code: string
    storedAt: Date | string | null
    readonlyRanges?: { from: number; to: number }[]
    defaultReadonlyRanges?: { from: number; to: number }[]
  }

  type Solution = {
    uuid: string
    status: 'completed' | 'in_progress'
    passedBasicTests: boolean
    passedBonusTests: boolean
  }

  interface Exercise {
    part: number
    language: 'jikiscript' | 'javascript'
    title: string
    slug: string
    id: number
    introductionHtml: string
    config: Config
    tasks: Task[]
    testResults: Pick<TestSuiteResult<NewTestResult>, 'status'> & {
      tests: (Pick<NewTestResult, 'status' | 'slug'> & { actual: string })[]
    }
  }

  type Project = { slug: string }

  type Config = {
    description?: string
    title?: string
    projectType?: string
    // tasks: Task[];
    testsType?: 'io' | 'state'
    interpreterOptions?: LanguageFeatures
    stdlibFunctions?: string[]
    exerciseFunctions?: string[]
    exerciseClasses?: string[]
  }
}
