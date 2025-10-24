import { createStoreWithMiddlewares } from './utils'

type TestStore = {
  inspectedTestResult: NewTestResult | null
  setInspectedTestResult: (inspectedTestResult: NewTestResult | null) => void
  testSuiteResult: TestSuiteResult<NewTestResult> | null
  setTestSuiteResult: (
    testSuiteResult: TestSuiteResult<NewTestResult> | null
  ) => void
  bonusTestSuiteResult: TestSuiteResult<NewTestResult> | null
  setBonusTestSuiteResult: (
    testSuiteResult: TestSuiteResult<NewTestResult> | null
  ) => void
  flatPreviewTaskTests: TaskTest[]
  setFlatPreviewTaskTests: (flatPreviewTaskTests: TaskTest[]) => void
  setInspectedPreviewTaskTest: (inspectedPreviewTaskTest: TaskTest) => void
  inspectedPreviewTaskTest: TaskTest
  hasSyntaxError: boolean
  setHasSyntaxError: (hasSyntaxError: boolean) => void
  cleanUpTestStore: () => void
  remainingBonusTasksCount: number
}

const useTestStore = createStoreWithMiddlewares<TestStore>(
  (set) => ({
    inspectedTestResult: null,
    setInspectedTestResult: (inspectedTestResult) => {
      set({ inspectedTestResult }, false, 'exercise/setTestResults')
    },
    flatPreviewTaskTests: [],
    setFlatPreviewTaskTests: (flatPreviewTaskTests) => {
      // Always ensure we have a valid inspectedPreviewTaskTest
      const inspectedTest: TaskTest = flatPreviewTaskTests.length > 0 
        ? flatPreviewTaskTests[0]! // Non-null assertion since we checked length > 0
        : {
            name: '',
            slug: '',
            data: null,
            setupFunctions: [],
            testsType: 'state' as TestsType,
          } as TaskTest // Fallback to minimal TaskTest if no items
      
      set(
        {
          flatPreviewTaskTests,
          inspectedPreviewTaskTest: inspectedTest,
        },
        false,
        'exercise/setFlatPreviewTaskTests'
      )
    },
    inspectedPreviewTaskTest: {} as TaskTest,
    setInspectedPreviewTaskTest: (inspectedPreviewTaskTest) => {
      set(
        { inspectedPreviewTaskTest },
        false,
        'exercise/setInspectedPreviewTaskTest'
      )
    },
    testSuiteResult: null,
    setTestSuiteResult: (testSuiteResult) => {
      set(
        { testSuiteResult: testSuiteResult },
        false,
        'exercise/setTestSuiteResult'
      )
    },
    bonusTestSuiteResult: null,
    setBonusTestSuiteResult: (bonusTestSuiteResult) => {
      const remainingBonusTasksCount = bonusTestSuiteResult?.tests.reduce(
        (count, bonusTest) =>
          count + (bonusTest.expects.every((expect) => expect.pass) ? 0 : 1),
        0
      )
      set(
        { 
          bonusTestSuiteResult, 
          remainingBonusTasksCount: remainingBonusTasksCount ?? 0 
        },
        false,
        'exercise/setTestSuiteResult'
      )
    },
    remainingBonusTasksCount: 0,
    hasSyntaxError: false,
    setHasSyntaxError: (hasSyntaxError) => {
      set({ hasSyntaxError }, false, 'exercise/setHasSyntaxError')
    },
    cleanUpTestStore: () => {
      set(
        {
          inspectedTestResult: null,
          testSuiteResult: null,
          bonusTestSuiteResult: null,
          hasSyntaxError: false,
        },
        false,
        'exercise/cleanUpTestStore'
      )
    },
  }),
  'TestStore'
)

export default useTestStore
