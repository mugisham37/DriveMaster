/**
 * Tests for migrated real-time channels
 * Verifies that all channels can be instantiated and have correct interfaces
 */

import {
  AIHelpRecordsChannel,
  IterationChannel,
  LatestIterationStatusChannel,
  MentorRequestChannel,
  MetricsChannel,
  ReputationChannel,
  SolutionChannel,
  SolutionWithLatestIterationChannel,
  TestRunChannel
} from '@/lib/realtime/channels'

// Mock the global connection pool
jest.mock('@/lib/realtime/connection-pool', () => ({
  globalConnectionPool: {
    getConnection: jest.fn().mockResolvedValue({
      send: jest.fn(),
      on: jest.fn(),
      isReady: jest.fn().mockReturnValue(true)
    }),
    releaseConnection: jest.fn()
  }
}))

describe('Real-time Channels', () => {
  const mockCallback = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AIHelpRecordsChannel', () => {
    it('should instantiate correctly', () => {
      const channel = new AIHelpRecordsChannel('test-submission-uuid', mockCallback)
      expect(channel).toBeInstanceOf(AIHelpRecordsChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
    })
  })

  describe('IterationChannel', () => {
    it('should instantiate correctly', () => {
      const channel = new IterationChannel('test-iteration-uuid', mockCallback)
      expect(channel).toBeInstanceOf(IterationChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
    })
  })

  describe('LatestIterationStatusChannel', () => {
    it('should instantiate correctly', () => {
      const channel = new LatestIterationStatusChannel('test-uuid', mockCallback)
      expect(channel).toBeInstanceOf(LatestIterationStatusChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
    })
  })

  describe('MentorRequestChannel', () => {
    it('should instantiate correctly', () => {
      const mockRequest = {
        uuid: 'test-request-uuid',
        status: 'pending' as const,
        trackSlug: 'javascript',
        exerciseSlug: 'hello-world',
        studentHandle: 'test-student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const channel = new MentorRequestChannel(mockRequest, mockCallback)
      expect(channel).toBeInstanceOf(MentorRequestChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
      expect(channel.cancelRequest).toBeDefined()
    })
  })

  describe('MetricsChannel', () => {
    it('should instantiate correctly', () => {
      const channel = new MetricsChannel(mockCallback)
      expect(channel).toBeInstanceOf(MetricsChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
      expect(channel.sendMetric).toBeDefined()
    })
  })

  describe('ReputationChannel', () => {
    it('should instantiate correctly', () => {
      const channel = new ReputationChannel(mockCallback)
      expect(channel).toBeInstanceOf(ReputationChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
      expect(channel.isConnected).toBeDefined()
    })
  })

  describe('SolutionChannel', () => {
    it('should instantiate correctly', () => {
      const mockSolution = {
        uuid: 'test-solution-uuid',
        status: 'started' as const
      }
      
      const channel = new SolutionChannel(mockSolution, mockCallback)
      expect(channel).toBeInstanceOf(SolutionChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
      expect(channel.publishSolution).toBeDefined()
      expect(channel.unpublishSolution).toBeDefined()
    })
  })

  describe('SolutionWithLatestIterationChannel', () => {
    it('should instantiate correctly', () => {
      const mockSolution = {
        uuid: 'test-solution-uuid',
        status: 'started' as const
      }
      
      const channel = new SolutionWithLatestIterationChannel(mockSolution, mockCallback)
      expect(channel).toBeInstanceOf(SolutionWithLatestIterationChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
    })
  })

  describe('TestRunChannel', () => {
    it('should instantiate correctly', () => {
      const mockTestRun = {
        id: 'test-run-id',
        uuid: 'test-run-uuid',
        submissionUuid: 'test-submission-uuid',
        status: 'queued' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const channel = new TestRunChannel(mockTestRun, mockCallback)
      expect(channel).toBeInstanceOf(TestRunChannel)
      expect(channel.isActive).toBeDefined()
      expect(channel.disconnect).toBeDefined()
      expect(channel.cancelTestRun).toBeDefined()
    })
  })
})