import { TestRun } from '../components/editor/types'

export class TestRunChannel {
  private testRun: TestRun
  private callback: (testRun: TestRun) => void

  constructor(testRun: TestRun, callback: (testRun: TestRun) => void) {
    this.testRun = testRun
    this.callback = callback
  }

  disconnect(): void {
    // Mock implementation - disconnect from channel
  }
}