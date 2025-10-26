import { TestRun } from '../components/editor/types'

export class TestRunChannel {
  private _testRun: TestRun
  private _callback: (testRun: TestRun) => void

  constructor(testRun: TestRun, callback: (testRun: TestRun) => void) {
    this._testRun = testRun
    this._callback = callback
  }

  disconnect(): void {
    // Mock implementation - disconnect from channel
  }
}